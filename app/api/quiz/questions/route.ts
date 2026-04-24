import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

type QuizQuestion = {
  id: string
  question: string
  options: string[]
  difficulty: 'easy' | 'medium' | 'hard'
}

function shuffle<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = copy[i]
    copy[i] = copy[j]
    copy[j] = temp
  }
  return copy
}

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

  const category = request.nextUrl.searchParams.get('category')
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 10), 5), 20)

  if (!category) {
    return NextResponse.json({ success: false, error: 'Category is required' }, { status: 400 })
  }

  const { data: categoryRow } = await supabase
    .from('quiz_categories')
    .select('slug')
    .eq('slug', category)
    .eq('is_active', true)
    .maybeSingle()

  if (!categoryRow) {
    return NextResponse.json({ success: false, error: 'Invalid category' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('quiz_questions')
    .select('id, question, options, difficulty')
    .eq('category_slug', category)
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  const questions = shuffle((data ?? []) as QuizQuestion[]).slice(0, limit)

  if (questions.length === 0) {
    return NextResponse.json({ success: false, error: 'No questions available for this category' }, { status: 400 })
  }

  return NextResponse.json(
    {
      success: true,
      category,
      questions,
    },
    { headers: response.headers },
  )
}
