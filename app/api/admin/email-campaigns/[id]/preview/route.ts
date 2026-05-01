import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'
import { buildUserSegmentQuery, UserSegmentCriteria } from '@/lib/admin/email-segments'
import { substituteVariables } from '@/lib/notifications/email'

async function ensureAdmin(request: NextRequest, response: NextResponse) {
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!profile || profile.role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true as const, supabase, userId: user.id }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const response = NextResponse.json({ success: true })
  const adminGate = await ensureAdmin(request, response)
  const { id } = await params

  if (!adminGate.ok) {
    return adminGate.response
  }

  const { data: campaign, error: campaignError } = await adminGate.supabase
    .from('email_campaigns')
    .select('*, email_templates(*)')
    .eq('id', id)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 400 })
  }

  const template = (campaign as any).email_templates
  if (!template) {
    return NextResponse.json({ success: false, error: 'Template not found for campaign' }, { status: 400 })
  }

  let segmentedUsers = []
  try {
    segmentedUsers = await buildUserSegmentQuery(adminGate.supabase, campaign.user_segment_criteria as UserSegmentCriteria)
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Failed to build user segment' },
      { status: 400 },
    )
  }

  const sampleUser = segmentedUsers[0] || {
    full_name: 'John Doe',
    level: 5,
    current_streak: 10,
  }

  const sampleVariables = {
    username: sampleUser.full_name || 'User',
    level: String(sampleUser.level),
    streak: String(sampleUser.current_streak),
    dashboardUrl: new URL('/dashboard', request.nextUrl.origin).toString(),
  }

  const previewSubject = substituteVariables(template.subject, sampleVariables)
  const previewHtml = substituteVariables(template.html_content, sampleVariables)

  return NextResponse.json(
    {
      success: true,
      preview: {
        subject: previewSubject,
        htmlContent: previewHtml,
        sampleUser: {
          email: sampleUser.email,
          fullName: sampleUser.full_name,
          level: sampleUser.level,
          streak: sampleUser.current_streak,
        },
      },
      segmentStats: {
        totalUsers: segmentedUsers.length,
        sampleCount: Math.min(5, segmentedUsers.length),
        sampleRecipients: segmentedUsers.slice(0, 5).map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.full_name,
          level: u.level,
          streak: u.current_streak,
        })),
      },
    },
    { headers: response.headers },
  )
}
