import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'
import { ensureAdmin } from '@/lib/auth/admin'

const createCategorySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can include lowercase letters, numbers, and hyphens only'),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).nullable().optional(),
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

  const [{ data: categories, error: categoriesError }, { data: questionRows, error: questionsError }, { data: attemptRows, error: attemptsError }] =
    await Promise.all([
      supabase
        .from('quiz_categories')
        .select('slug, name, description, is_active, created_at')
        .order('name', { ascending: true }),
      supabase.from('quiz_questions').select('category_slug, is_active'),
      supabase.from('quiz_attempts').select('category_slug'),
    ])

  const firstError = categoriesError || questionsError || attemptsError
  if (firstError) {
    return NextResponse.json({ success: false, error: firstError.message }, { status: 400 })
  }

  const questionsByCategory = new Map<string, { total: number; active: number }>()
  for (const row of questionRows ?? []) {
    const current = questionsByCategory.get(row.category_slug) ?? { total: 0, active: 0 }
    current.total += 1
    if (row.is_active) current.active += 1
    questionsByCategory.set(row.category_slug, current)
  }

  const attemptsByCategory = new Map<string, number>()
  for (const row of attemptRows ?? []) {
    attemptsByCategory.set(row.category_slug, (attemptsByCategory.get(row.category_slug) ?? 0) + 1)
  }

  return NextResponse.json(
    {
      success: true,
      categories: (categories ?? []).map((category) => ({
        slug: category.slug,
        name: category.name,
        description: category.description,
        isActive: category.is_active,
        createdAt: category.created_at,
        totalQuestions: questionsByCategory.get(category.slug)?.total ?? 0,
        activeQuestions: questionsByCategory.get(category.slug)?.active ?? 0,
        attempts: attemptsByCategory.get(category.slug) ?? 0,
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
  const parsed = createCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  const payload = parsed.data

  const { error } = await supabase.from('quiz_categories').insert({
    slug: payload.slug,
    name: payload.name,
    description: payload.description ?? null,
    is_active: payload.isActive ?? true,
  })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}
