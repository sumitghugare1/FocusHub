import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'
import { verifyRoomPassword } from '@/lib/auth/room-password'

const joinSchema = z.object({
  password: z.string().optional().nullable(),
})

export async function POST(
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

  const body = await request.json().catch(() => null)
  const parsed = joinSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid join request' }, { status: 400 })
  }

  const { data: room, error: roomError } = await supabase.rpc('get_room_join_access', {
    room_id: id,
  })

  if (roomError) {
    return NextResponse.json({ success: false, error: roomError.message }, { status: 400 })
  }

  const roomData = Array.isArray(room) ? room[0] : room

  if (!roomData) {
    return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
  }

  const isHost = roomData.host_id === user.id

  const { data: existingMember } = await supabase
    .from('room_members')
    .select('id')
    .eq('room_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingMember || isHost) {
    return NextResponse.json({ success: true, joined: true }, { headers: response.headers })
  }

  if (roomData.is_private) {
    const ok = verifyRoomPassword(parsed.data.password ?? '', roomData.password_hash)
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Invalid room password' }, { status: 403 })
    }
  }

  const { error: insertError } = await supabase.from('room_members').insert({
    room_id: id,
    user_id: user.id,
    role: 'member',
    status: 'active',
  })

  if (insertError) {
    return NextResponse.json({ success: false, error: insertError.message }, { status: 400 })
  }

  await supabase.from('activity_feed').insert({
    user_id: user.id,
    type: 'room_joined',
    description: 'Joined a study room',
    related_type: 'room',
    related_id: id,
    is_public: true,
  })

  return NextResponse.json({ success: true, joined: true }, { headers: response.headers })
}
