import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'
import { buildUserSegmentQuery, UserSegmentCriteria } from '@/lib/admin/email-segments'
import { sendCampaignEmail } from '@/lib/notifications/email'

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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  if (segmentedUsers.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No users match the specified segment criteria' },
      { status: 400 },
    )
  }

  const logEntries = segmentedUsers.map((user) => ({
    campaign_id: id,
    user_id: user.id,
    email: user.email,
    status: 'pending',
  }))

  const { error: logsInsertError } = await adminGate.supabase
    .from('email_campaign_logs')
    .insert(logEntries)

  if (logsInsertError) {
    return NextResponse.json({ success: false, error: logsInsertError.message }, { status: 400 })
  }

  let sentCount = 0
  let failedCount = 0
  const errors: Array<{ email: string; error: string }> = []

  for (const user of segmentedUsers) {
    const variables = {
      username: user.full_name || user.email || 'User',
      level: String(user.level),
      streak: String(user.current_streak),
      dashboardUrl: new URL('/dashboard', request.nextUrl.origin).toString(),
    }

    const result = await sendCampaignEmail({
      to: user.email ?? '',
      subject: template.subject,
      htmlContent: template.html_content,
      plainTextContent: template.plain_text_content,
      variables,
    })

    if (result.sent) {
      sentCount++
      await adminGate.supabase
        .from('email_campaign_logs')
        .update({
          status: 'sent',
          attempted_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        })
        .eq('campaign_id', id)
        .eq('email', user.email)
    } else {
      failedCount++
      errors.push({ email: user.email ?? '', error: result.error ?? 'Unknown error' })
      await adminGate.supabase
        .from('email_campaign_logs')
        .update({
          status: 'failed',
          error_message: result.error,
          attempted_at: new Date().toISOString(),
        })
        .eq('campaign_id', id)
        .eq('email', user.email)
    }
  }

  await adminGate.supabase
    .from('email_campaigns')
    .update({
      status: 'sent',
      sent_count: sentCount,
      failed_count: failedCount,
    })
    .eq('id', id)

  return NextResponse.json(
    {
      success: true,
      results: {
        total: segmentedUsers.length,
        sent: sentCount,
        failed: failedCount,
        errors: errors.slice(0, 10),
      },
    },
    { headers: response.headers },
  )
}
