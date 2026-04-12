import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'
import { hashRoomPassword } from '@/lib/auth/room-password'

const createRoomSchema = z.object({
  name: z.string().trim().min(2, 'Room name is required'),
  description: z.string().trim().optional().nullable(),
  category: z
    .enum([
      'general',
      'programming',
      'design',
      'writing',
      'math',
      'science',
      'languages',
      'music',
      'other',
    ])
    .default('general'),
  maxParticipants: z.number().int().min(2).max(50).default(10),
  isPrivate: z.boolean().default(false),
  password: z.string().min(4, 'Password must be at least 4 characters').optional().nullable(),
})

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const { data: rooms, error } = await supabase
    .from('rooms')
    .select(`
      id,
      name,
      description,
      category,
      is_private,
      max_participants,
      status,
      created_at,
      host_id,
      profiles:host_id ( full_name, username )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  const { data: memberships } = await supabase
    .from('room_members')
    .select('room_id, user_id')

  const memberCountByRoom = (memberships ?? []).reduce<Record<string, number>>((acc, item) => {
    acc[item.room_id] = (acc[item.room_id] ?? 0) + 1
    return acc
  }, {})

  const mapped = (rooms ?? []).map((room) => ({
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
    participantCount: memberCountByRoom[room.id] ?? 0,
    hostId: room.host_id,
  }))

  return NextResponse.json({ success: true, rooms: mapped }, { headers: response.headers })
}

export async function POST(request: NextRequest) {
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
  const parsed = createRoomSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid room data' },
      { status: 400 },
    )
  }

  const payload = parsed.data

  if (payload.isPrivate && !payload.password) {
    return NextResponse.json(
      { success: false, error: 'Password is required for private rooms' },
      { status: 400 },
    )
  }

  const passwordHash = payload.isPrivate
    ? hashRoomPassword(payload.password ?? '')
    : null

  const { data: createdRoom, error: createError } = await supabase
    .from('rooms')
    .insert({
      name: payload.name,
      description: payload.description || null,
      host_id: user.id,
      category: payload.category,
      is_private: payload.isPrivate,
      password_hash: passwordHash,
      max_participants: payload.maxParticipants,
      status: 'active',
    })
    .select('id, name')
    .single()

  if (createError) {
    return NextResponse.json({ success: false, error: createError.message }, { status: 400 })
  }

  const { error: memberError } = await supabase.from('room_members').insert({
    room_id: createdRoom.id,
    user_id: user.id,
    role: 'host',
    status: 'active',
  })

  if (memberError) {
    return NextResponse.json(
      {
        success: false,
        error: memberError.message,
      },
      { status: 400 },
    )
  }

  await supabase.from('activity_feed').insert({
    user_id: user.id,
    type: 'room_created',
    description: `Created room ${createdRoom.name}`,
    related_type: 'room',
    related_id: createdRoom.id,
    is_public: true,
  })

  return NextResponse.json(
    {
      success: true,
      room: {
        id: createdRoom.id,
        name: createdRoom.name,
      },
    },
    { headers: response.headers },
  )
}
