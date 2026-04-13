import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'

const createSchema = z.object({
  roomId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  estimatedMinutes: z.number().int().min(1).max(1440).optional().nullable(),
})

async function canAccessRoom(supabase: ReturnType<typeof createRouteClient>, roomId: string, userId: string) {
  const [{ data: membership }, { data: room }] = await Promise.all([
    supabase.from('room_members').select('id').eq('room_id', roomId).eq('user_id', userId).maybeSingle(),
    supabase.from('rooms').select('host_id, is_private').eq('id', roomId).maybeSingle(),
  ])

  return Boolean(membership) || room?.host_id === userId || room?.is_private === false
}

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

  const roomId = request.nextUrl.searchParams.get('roomId')
  if (roomId && !(await canAccessRoom(supabase, roomId, user.id))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  let query = supabase
    .from('study_planner_items')
    .select('id, user_id, room_id, title, description, due_date, priority, status, estimated_minutes, completed_at, order_index, created_at, updated_at, profiles:user_id ( full_name, username, avatar_url ), rooms:room_id ( name )')

  if (roomId) {
    query = query.eq('room_id', roomId)
  } else {
    query = query.eq('user_id', user.id).is('room_id', null)
  }

  const { data: items, error } = await query.order('status', { ascending: true }).order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json(
    {
      success: true,
      items:
        items?.map((item) => {
          const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
          const room = Array.isArray(item.rooms) ? item.rooms[0] : item.rooms
          return {
            id: item.id,
            userId: item.user_id,
            roomId: item.room_id,
            roomName: room?.name ?? null,
            userName: profile?.full_name || profile?.username || 'User',
            userAvatar: profile?.avatar_url || undefined,
            title: item.title,
            description: item.description,
            dueDate: item.due_date,
            priority: item.priority,
            status: item.status,
            estimatedMinutes: item.estimated_minutes,
            completedAt: item.completed_at,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          }
        }) ?? [],
    },
    { headers: response.headers },
  )
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
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  if (parsed.data.roomId && !(await canAccessRoom(supabase, parsed.data.roomId, user.id))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { data: inserted, error } = await supabase
    .from('study_planner_items')
    .insert({
      user_id: user.id,
      room_id: parsed.data.roomId ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      due_date: parsed.data.dueDate ?? null,
      priority: parsed.data.priority,
      status: 'todo',
      estimated_minutes: parsed.data.estimatedMinutes ?? null,
    })
    .select('id, user_id, room_id, title, description, due_date, priority, status, estimated_minutes, completed_at, order_index, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, item: inserted }, { headers: response.headers })
}
