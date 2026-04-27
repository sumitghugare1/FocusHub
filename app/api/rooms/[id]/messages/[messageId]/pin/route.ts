import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const { id, messageId } = await params

  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is host or moderator of the room
  const { data: membership } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || !['host', 'moderator'].includes(membership.role)) {
    return NextResponse.json({ success: false, error: 'Only hosts and moderators can pin messages' }, { status: 403 })
  }

  // Get the message to check it belongs to this room
  const { data: message } = await supabase
    .from('room_messages')
    .select('id, is_pinned')
    .eq('id', messageId)
    .eq('room_id', id)
    .maybeSingle()

  if (!message) {
    return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 })
  }

  // Toggle pin status
  const newPinStatus = !message.is_pinned

  const { data: updatedMessage, error } = await supabase
    .from('room_messages')
    .update({ is_pinned: newPinStatus })
    .eq('id', messageId)
    .select('id, room_id, user_id, content, message_type, reply_to_id, created_at, expires_at, is_pinned, author_role, profiles:user_id ( full_name, username, avatar_url )')
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  const profile = Array.isArray(updatedMessage.profiles) ? updatedMessage.profiles[0] : updatedMessage.profiles
  const expiresAt = updatedMessage.expires_at ? new Date(updatedMessage.expires_at) : null
  const now = new Date()
  const expiresIn = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)) : null

  return NextResponse.json(
    {
      success: true,
      message: {
        id: updatedMessage.id,
        roomId: updatedMessage.room_id,
        userId: updatedMessage.user_id,
        userName: profile?.full_name || profile?.username || 'User',
        userAvatar: profile?.avatar_url || undefined,
        content: updatedMessage.content,
        timestamp: updatedMessage.created_at,
        messageType: updatedMessage.message_type,
        expiresAt: updatedMessage.expires_at,
        expiresIn,
        isPinned: updatedMessage.is_pinned,
        authorRole: updatedMessage.author_role,
      },
    },
    { headers: response.headers },
  )
}
