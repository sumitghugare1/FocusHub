import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'

const ROOM_SHARED_ASSETS_BUCKET = 'room-shared-assets'

const updateSchema = z.object({
  title: z.string().trim().max(200).optional(),
  content: z.string().trim().max(10000).optional(),
})

async function canAccessRoom(supabase: ReturnType<typeof createRouteClient>, roomId: string, userId: string) {
  const [{ data: membership }, { data: room }] = await Promise.all([
    supabase.from('room_members').select('id').eq('room_id', roomId).eq('user_id', userId).maybeSingle(),
    supabase.from('rooms').select('host_id, is_private').eq('id', roomId).maybeSingle(),
  ])

  return Boolean(membership) || room?.host_id === userId || room?.is_private === false
}

async function canManageResource(
  supabase: ReturnType<typeof createRouteClient>,
  roomId: string,
  resourceId: string,
  userId: string,
) {
  const [{ data: room }, { data: resource }] = await Promise.all([
    supabase.from('rooms').select('host_id').eq('id', roomId).maybeSingle(),
    supabase
      .from('room_shared_resources')
      .select('id, user_id, file_path, resource_type, room_id')
      .eq('id', resourceId)
      .eq('room_id', roomId)
      .maybeSingle(),
  ])

  if (!resource) return { ok: false as const, status: 404, error: 'Resource not found' }

  const canManage = resource.user_id === userId || room?.host_id === userId
  if (!canManage) return { ok: false as const, status: 403, error: 'Forbidden' }

  return { ok: true as const, resource }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> },
) {
  const { id, resourceId } = await params

  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await canAccessRoom(supabase, id, user.id))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const manageResult = await canManageResource(supabase, id, resourceId, user.id)
  if (!manageResult.ok) {
    return NextResponse.json({ success: false, error: manageResult.error }, { status: manageResult.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  const updates: Record<string, string | null> = {}
  if (typeof parsed.data.title !== 'undefined') updates.title = parsed.data.title || null
  if (typeof parsed.data.content !== 'undefined') updates.content = parsed.data.content || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('room_shared_resources')
    .update(updates)
    .eq('id', resourceId)
    .eq('room_id', id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> },
) {
  const { id, resourceId } = await params

  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await canAccessRoom(supabase, id, user.id))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const manageResult = await canManageResource(supabase, id, resourceId, user.id)
  if (!manageResult.ok) {
    return NextResponse.json({ success: false, error: manageResult.error }, { status: manageResult.status })
  }

  if (manageResult.resource.file_path) {
    const { error: storageError } = await supabase.storage
      .from(ROOM_SHARED_ASSETS_BUCKET)
      .remove([manageResult.resource.file_path])

    if (storageError) {
      return NextResponse.json({ success: false, error: storageError.message }, { status: 400 })
    }
  }

  const { error } = await supabase
    .from('room_shared_resources')
    .delete()
    .eq('id', resourceId)
    .eq('room_id', id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}
