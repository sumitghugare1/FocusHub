import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

const ROOM_SHARED_ASSETS_BUCKET = 'room-shared-assets'

async function canAccessRoom(supabase: ReturnType<typeof createRouteClient>, roomId: string, userId: string) {
  const [{ data: membership }, { data: room }] = await Promise.all([
    supabase.from('room_members').select('id').eq('room_id', roomId).eq('user_id', userId).maybeSingle(),
    supabase.from('rooms').select('host_id, is_private').eq('id', roomId).maybeSingle(),
  ])

  return Boolean(membership) || room?.host_id === userId || room?.is_private === false
}

export async function GET(
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

  const { data: resource, error } = await supabase
    .from('room_shared_resources')
    .select('id, room_id, file_path, file_name, resource_type')
    .eq('id', resourceId)
    .eq('room_id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  if (!resource || resource.resource_type !== 'file' || !resource.file_path) {
    return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 })
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from(ROOM_SHARED_ASSETS_BUCKET)
    .createSignedUrl(resource.file_path, 60 * 10)

  if (signedUrlError || !data?.signedUrl) {
    return NextResponse.json(
      { success: false, error: signedUrlError?.message ?? 'Unable to generate download link' },
      { status: 400 },
    )
  }

  return NextResponse.redirect(data.signedUrl)
}
