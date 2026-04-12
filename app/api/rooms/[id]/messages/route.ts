import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'

const messageSchema = z.object({
  content: z.string().trim().min(1, 'Message is required').max(2000),
})

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

  const { data: membership } = await supabase
    .from('room_members')
    .select('id')
    .eq('room_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, is_private')
    .eq('id', id)
    .maybeSingle()

  const isHost = room?.host_id === user.id
  const canAccess = Boolean(membership) || isHost || room?.is_private === false

  if (!canAccess) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { data: messages, error } = await supabase
    .from('room_messages')
    .select('id, room_id, user_id, content, message_type, reply_to_id, created_at, profiles:user_id ( full_name, username, avatar_url )')
    .eq('room_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  const mapped = (messages ?? []).map((message) => {
    const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles
    return {
      id: message.id,
      roomId: message.room_id,
      userId: message.user_id,
      userName: profile?.full_name || profile?.username || 'User',
      userAvatar: profile?.avatar_url || undefined,
      content: message.content,
      timestamp: message.created_at,
      messageType: message.message_type,
    }
  })

  return NextResponse.json({ success: true, messages: mapped }, { headers: response.headers })
}

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
  const parsed = messageSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid message' }, { status: 400 })
  }

  const { data: membership } = await supabase
    .from('room_members')
    .select('id')
    .eq('room_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, is_private')
    .eq('id', id)
    .maybeSingle()

  const isHost = room?.host_id === user.id
  const canAccess = Boolean(membership) || isHost || room?.is_private === false

  if (!canAccess) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { data: insertedMessage, error } = await supabase
    .from('room_messages')
    .insert({
      room_id: id,
      user_id: user.id,
      content: parsed.data.content,
      message_type: 'text',
    })
    .select('id, room_id, user_id, content, message_type, reply_to_id, created_at, profiles:user_id ( full_name, username, avatar_url )')
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  const profile = Array.isArray(insertedMessage.profiles) ? insertedMessage.profiles[0] : insertedMessage.profiles

  return NextResponse.json(
    {
      success: true,
      message: {
        id: insertedMessage.id,
        roomId: insertedMessage.room_id,
        userId: insertedMessage.user_id,
        userName: profile?.full_name || profile?.username || 'User',
        userAvatar: profile?.avatar_url || undefined,
        content: insertedMessage.content,
        timestamp: insertedMessage.created_at,
        messageType: insertedMessage.message_type,
      },
    },
    { headers: response.headers },
  )
}
