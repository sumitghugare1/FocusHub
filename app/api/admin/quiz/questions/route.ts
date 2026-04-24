import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'
import { ensureAdmin } from '@/lib/auth/admin'

const createQuestionSchema = z.object({
  categorySlug: z.string().trim().min(1),
  question: z.string().trim().min(8).max(400),
  options: z.array(z.string().trim().min(1).max(240)).length(4),
  correctOption: z.number().int().min(0).max(3),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string().trim().max(400).nullable().optional(),
  isActive: z.boolean().optional(),
})

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

  const adminGate = await ensureAdmin(supabase, user.id)
  if (!adminGate.ok) {
    return NextResponse.json({ success: false, error: adminGate.message }, { status: adminGate.status })
  }

  const category = request.nextUrl.searchParams.get('category')
  const difficulty = request.nextUrl.searchParams.get('difficulty')
  const search = request.nextUrl.searchParams.get('search')

  let query = supabase
    .from('quiz_questions')
    .select('id, category_slug, question, options, correct_option, difficulty, explanation, is_active, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (category && category !== 'all') {
    query = query.eq('category_slug', category)
  }

  if (difficulty && difficulty !== 'all') {
    query = query.eq('difficulty', difficulty)
  }

  if (search && search.trim()) {
    query = query.ilike('question', `%${search.trim()}%`)
  }

  const { data, error } = await query.limit(500)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json(
    {
      success: true,
      questions: (data ?? []).map((row) => ({
        id: row.id,
        categorySlug: row.category_slug,
        question: row.question,
        options: row.options,
        correctOption: row.correct_option,
        difficulty: row.difficulty,
        explanation: row.explanation,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    },
    { headers: response.headers },
  )
}

export async function POST(request: NextRequest) {
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
  const parsed = createQuestionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  const payload = parsed.data

  const { error } = await supabase.from('quiz_questions').insert({
    category_slug: payload.categorySlug,
    question: payload.question,
    options: payload.options,
    correct_option: payload.correctOption,
    difficulty: payload.difficulty,
    explanation: payload.explanation ?? null,
    is_active: payload.isActive ?? true,
  })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}
