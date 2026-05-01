import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'
import { buildUserSegmentQuery, UserSegmentCriteria } from '@/lib/admin/email-segments'

const createCampaignSchema = z.object({
  templateId: z.string().uuid('Invalid template ID'),
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  userSegmentCriteria: z.object({
    tiers: z.array(z.enum(['free', 'pro', 'premium'])).optional(),
    activityStatus: z.array(z.enum(['active', 'inactive'])).optional(),
    streakMinimum: z.number().int().min(0).optional(),
    respectPreferences: z.boolean().optional(),
  }),
  scheduledFor: z.string().datetime().optional().nullable(),
})

type CreateCampaignPayload = z.infer<typeof createCampaignSchema>

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

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  const adminGate = await ensureAdmin(request, response)

  if (!adminGate.ok) {
    return adminGate.response
  }

  const body = await request.json().catch(() => null)
  const parsed = createCampaignSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  // Verify template exists
  const { data: template, error: templateError } = await adminGate.supabase
    .from('email_templates')
    .select('id')
    .eq('id', parsed.data.templateId)
    .single()

  if (templateError || !template) {
    return NextResponse.json({ success: false, error: 'Template not found' }, { status: 400 })
  }

  // Build user segment to get count
  let segmentedUsers = []
  try {
    segmentedUsers = await buildUserSegmentQuery(adminGate.supabase, parsed.data.userSegmentCriteria as UserSegmentCriteria)
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Failed to build user segment' },
      { status: 400 },
    )
  }

  // Create campaign
  const { data: campaign, error: insertError } = await adminGate.supabase
    .from('email_campaigns')
    .insert({
      template_id: parsed.data.templateId,
      name: parsed.data.name,
      description: parsed.data.description,
      user_segment_criteria: parsed.data.userSegmentCriteria,
      scheduled_for: parsed.data.scheduledFor,
      status: parsed.data.scheduledFor ? 'pending' : 'draft',
      created_by: adminGate.userId,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ success: false, error: insertError.message }, { status: 400 })
  }

  return NextResponse.json(
    {
      success: true,
      campaign: {
        id: campaign.id,
        templateId: campaign.template_id,
        name: campaign.name,
        description: campaign.description,
        userSegmentCriteria: campaign.user_segment_criteria,
        scheduledFor: campaign.scheduled_for,
        status: campaign.status,
        sentCount: campaign.sent_count,
        failedCount: campaign.failed_count,
        createdAt: campaign.created_at,
      },
      segmentCount: segmentedUsers.length,
      sampleRecipients: segmentedUsers.slice(0, 5).map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
      })),
    },
    { headers: response.headers },
  )
}

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  const adminGate = await ensureAdmin(request, response)

  if (!adminGate.ok) {
    return adminGate.response
  }

  const limit = 20
  const page = Number(new URL(request.url).searchParams.get('page')) || 1
  const offset = (page - 1) * limit

  const { data: campaigns, error: queryError, count } = await adminGate.supabase
    .from('email_campaigns')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (queryError) {
    return NextResponse.json({ success: false, error: queryError.message }, { status: 400 })
  }

  return NextResponse.json(
    {
      success: true,
      campaigns: (campaigns ?? []).map((c) => ({
        id: c.id,
        templateId: c.template_id,
        name: c.name,
        description: c.description,
        userSegmentCriteria: c.user_segment_criteria,
        scheduledFor: c.scheduled_for,
        status: c.status,
        sentCount: c.sent_count,
        failedCount: c.failed_count,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
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
