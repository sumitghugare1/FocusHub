import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  htmlContent: z.string().min(1, 'HTML content is required'),
  plainTextContent: z.string().optional(),
})

type CreateTemplatePayload = z.infer<typeof createTemplateSchema>

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
  const parsed = createTemplateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  const { data: template, error: insertError } = await adminGate.supabase
    .from('email_templates')
    .insert({
      name: parsed.data.name,
      description: parsed.data.description,
      subject: parsed.data.subject,
      html_content: parsed.data.htmlContent,
      plain_text_content: parsed.data.plainTextContent,
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
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        subject: template.subject,
        htmlContent: template.html_content,
        plainTextContent: template.plain_text_content,
        createdAt: template.created_at,
      },
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

  const { data: templates, error: queryError, count } = await adminGate.supabase
    .from('email_templates')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (queryError) {
    return NextResponse.json({ success: false, error: queryError.message }, { status: 400 })
  }

  return NextResponse.json(
    {
      success: true,
      templates: (templates ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        subject: t.subject,
        htmlContent: t.html_content,
        plainTextContent: t.plain_text_content,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
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
