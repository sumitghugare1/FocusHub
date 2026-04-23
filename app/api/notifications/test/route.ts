import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'
import { sendTestNotificationEmail, isEmailConfigured } from '@/lib/notifications/email'

export async function POST(request: NextRequest) {
  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM_EMAIL.',
      },
      { status: 400 },
    )
  }

  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const destination = profile?.email ?? user.email
  if (!destination) {
    return NextResponse.json({ success: false, error: 'No email address available' }, { status: 400 })
  }

  const result = await sendTestNotificationEmail({
    to: destination,
    userName: profile?.full_name ?? user.user_metadata?.full_name ?? 'there',
    dashboardUrl: new URL('/dashboard', request.nextUrl.origin).toString(),
  })

  if (!result.sent) {
    return NextResponse.json({ success: false, error: result.error ?? 'Unable to send email' }, { status: 500 })
  }

  return NextResponse.json({ success: true, messageId: result.messageId }, { headers: response.headers })
}