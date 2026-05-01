import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

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
    .select('id')
    .eq('id', id)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 400 })
  }

  const limit = 50
  const page = Number(new URL(request.url).searchParams.get('page')) || 1
  const offset = (page - 1) * limit
  const status = new URL(request.url).searchParams.get('status') || undefined

  let query = adminGate.supabase
    .from('email_campaign_logs')
    .select('*', { count: 'exact' })
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: logs, error: logsError, count } = await query.range(offset, offset + limit - 1)

  if (logsError) {
    return NextResponse.json({ success: false, error: logsError.message }, { status: 400 })
  }

  return NextResponse.json(
    {
      success: true,
      logs: (logs ?? []).map((log) => ({
        id: log.id,
        userId: log.user_id,
        email: log.email,
        status: log.status,
        errorMessage: log.error_message,
        attemptedAt: log.attempted_at,
        sentAt: log.sent_at,
        createdAt: log.created_at,
      })),
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    },
    { headers: response.headers },
  )
}
