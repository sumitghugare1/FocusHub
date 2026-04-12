import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: room, error } = await supabase
    .from('rooms')
    .select(
      `
      id,
      name,
      description,
      category,
      is_private,
      max_participants,
      status,
      host_id,
      profiles:host_id ( full_name, username )
    `,
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  if (!room) {
    return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
  }

  const { data: membership } = await supabase
    .from('room_members')
    .select('id')
    .eq('room_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isHost = room.host_id === user.id
  const isMember = Boolean(membership) || isHost

  const { data: memberships } = await supabase
    .from('room_members')
    .select('user_id')
    .eq('room_id', id)

  return NextResponse.json(
    {
      success: true,
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        topic: room.category,
        hostName:
          (Array.isArray(room.profiles) ? room.profiles[0]?.full_name : room.profiles?.full_name) ||
          (Array.isArray(room.profiles) ? room.profiles[0]?.username : room.profiles?.username) ||
          'Host',
        isPrivate: room.is_private,
        status: room.status,
        maxParticipants: room.max_participants,
        participantCount: memberships?.length ?? 0,
        requiresPassword: room.is_private && !isMember,
        isMember,
        isHost,
      },
    },
    { headers: response.headers },
  )
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, host_id')
    .eq('id', id)
    .maybeSingle()

  if (roomError) {
    return NextResponse.json({ success: false, error: roomError.message }, { status: 400 })
  }

  if (!room) {
    return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
  }

  if (room.host_id !== user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('rooms').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, deleted: true }, { headers: response.headers })
}
