import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'
import { ensureAdmin } from '@/lib/auth/admin'

const updateQuestionSchema = z.object({
  categorySlug: z.string().trim().min(1).optional(),
  question: z.string().trim().min(8).max(400).optional(),
  options: z.array(z.string().trim().min(1).max(240)).length(4).optional(),
  correctOption: z.number().int().min(0).max(3).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  explanation: z.string().trim().max(400).nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const adminGate = await ensureAdmin(supabase, user.id)
  if (!adminGate.ok) {
    return NextResponse.json({ success: false, error: adminGate.message }, { status: adminGate.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateQuestionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  const payload = parsed.data
  const routeParams = await params

  if (
    payload.categorySlug === undefined &&
    payload.question === undefined &&
    payload.options === undefined &&
    payload.correctOption === undefined &&
    payload.difficulty === undefined &&
    payload.explanation === undefined &&
    payload.isActive === undefined
  ) {
    return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 })
  }

  const { error } = await supabase
    .from('quiz_questions')
    .update({
      category_slug: payload.categorySlug,
      question: payload.question,
      options: payload.options,
      correct_option: payload.correctOption,
      difficulty: payload.difficulty,
      explanation: payload.explanation,
      is_active: payload.isActive,
    })
    .eq('id', routeParams.id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const adminGate = await ensureAdmin(supabase, user.id)
  if (!adminGate.ok) {
    return NextResponse.json({ success: false, error: adminGate.message }, { status: adminGate.status })
  }

  const routeParams = await params

  const { error } = await supabase.from('quiz_questions').delete().eq('id', routeParams.id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}
