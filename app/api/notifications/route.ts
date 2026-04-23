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

  const [{ data: notifications, error: notificationsError }, { count: unreadCount, error: unreadError }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, type, title, message, created_at, is_read')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
  ])

  if (notificationsError || unreadError) {
    const error = notificationsError ?? unreadError
    return NextResponse.json({ success: false, error: error?.message ?? 'Unable to load notifications' }, { status: 400 })
  }

  return NextResponse.json(
    {
      success: true,
      unreadCount: unreadCount ?? 0,
      notifications: notifications ?? [],
    },
    { headers: response.headers },
  )
}