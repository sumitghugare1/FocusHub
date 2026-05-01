import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  subject: z.string().min(1).optional(),
  htmlContent: z.string().min(1).optional(),
  plainTextContent: z.string().optional(),
})

type UpdateTemplatePayload = z.infer<typeof updateTemplateSchema>

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

  const { data: template, error: queryError } = await adminGate.supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (queryError) {
    return NextResponse.json(
      { success: false, error: queryError.code === 'PGRST116' ? 'Template not found' : queryError.message },
      { status: 400 },
    )
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
        updatedAt: template.updated_at,
      },
    },
    { headers: response.headers },
  )
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const response = NextResponse.json({ success: true })
  const adminGate = await ensureAdmin(request, response)
  const { id } = await params

  if (!adminGate.ok) {
    return adminGate.response
  }

  const body = await request.json().catch(() => null)
  const parsed = updateTemplateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  const updateData: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description
  if (parsed.data.subject !== undefined) updateData.subject = parsed.data.subject
  if (parsed.data.htmlContent !== undefined) updateData.html_content = parsed.data.htmlContent
  if (parsed.data.plainTextContent !== undefined) updateData.plain_text_content = parsed.data.plainTextContent

  const { data: template, error: updateError } = await adminGate.supabase
    .from('email_templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 400 })
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
        updatedAt: template.updated_at,
      },
    },
    { headers: response.headers },
  )
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const response = NextResponse.json({ success: true })
  const adminGate = await ensureAdmin(request, response)
  const { id } = await params

  if (!adminGate.ok) {
    return adminGate.response
  }

  const { error: deleteError } = await adminGate.supabase
    .from('email_templates')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ success: false, error: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}
