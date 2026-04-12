import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const [{ data: rooms, error: roomsError }, { data: memberships, error: membersError }] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, name, category, host_id, max_participants, is_private, status, total_focus_minutes, created_at, profiles:host_id(full_name, username, avatar_url)')
      .order('created_at', { ascending: false }),
    supabase.from('room_members').select('room_id'),
  ])

  if (roomsError || membersError) {
    return NextResponse.json(
      { success: false, error: roomsError?.message || membersError?.message || 'Failed to load rooms' },
      { status: 400 },
    )
  }

  const memberCountByRoom = (memberships ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.room_id] = (acc[row.room_id] ?? 0) + 1
    return acc
  }, {})

  const mappedRooms = (rooms ?? []).map((room) => {
    const host = Array.isArray(room.profiles) ? room.profiles[0] : room.profiles
    return {
      id: room.id,
      name: room.name,
      host: {
        name: host?.full_name || host?.username || 'Host',
        avatar: host?.avatar_url || '',
      },
      category: room.category,
      participants: memberCountByRoom[room.id] ?? 0,
      maxParticipants: room.max_participants,
      isPrivate: room.is_private,
      status: room.status,
      totalHours: Math.round((room.total_focus_minutes ?? 0) / 60),
      createdAt: room.created_at,
    }
  })

  const stats = {
    total: mappedRooms.length,
    active: mappedRooms.filter((r) => r.status === 'active').length,
    inactive: mappedRooms.filter((r) => r.status !== 'active').length,
    flagged: 0,
  }

  return NextResponse.json({ success: true, stats, rooms: mappedRooms }, { headers: response.headers })
}
