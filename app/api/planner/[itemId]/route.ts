import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['todo', 'in_progress', 'completed']).optional(),
  estimatedMinutes: z.number().int().min(1).max(1440).optional().nullable(),
})

async function canManageItem(
  supabase: ReturnType<typeof createRouteClient>,
  itemId: string,
  userId: string,
) {
  const { data: item } = await supabase
    .from('study_planner_items')
    .select('id, user_id, room_id')
    .eq('id', itemId)
    .maybeSingle()

  if (!item) return { ok: false as const, status: 404, error: 'Item not found' }

  if (item.user_id === userId) return { ok: true as const, item }

  if (item.room_id) {
    const { data: room } = await supabase.from('rooms').select('host_id').eq('id', item.room_id).maybeSingle()
    if (room?.host_id === userId) return { ok: true as const, item }
  }

  return { ok: false as const, status: 403, error: 'Forbidden' }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params

  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const manageResult = await canManageItem(supabase, itemId, user.id)
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

  const updates: Record<string, unknown> = {}
  if (typeof parsed.data.title !== 'undefined') updates.title = parsed.data.title
  if (typeof parsed.data.description !== 'undefined') updates.description = parsed.data.description
  if (typeof parsed.data.dueDate !== 'undefined') updates.due_date = parsed.data.dueDate
  if (typeof parsed.data.priority !== 'undefined') updates.priority = parsed.data.priority
  if (typeof parsed.data.status !== 'undefined') {
    updates.status = parsed.data.status
    updates.completed_at = parsed.data.status === 'completed' ? new Date().toISOString() : null
  }
  if (typeof parsed.data.estimatedMinutes !== 'undefined') updates.estimated_minutes = parsed.data.estimatedMinutes

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('study_planner_items')
    .update(updates)
    .eq('id', itemId)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params

  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const manageResult = await canManageItem(supabase, itemId, user.id)
  if (!manageResult.ok) {
    return NextResponse.json({ success: false, error: manageResult.error }, { status: manageResult.status })
  }

  const { error } = await supabase.from('study_planner_items').delete().eq('id', itemId)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}
