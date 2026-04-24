import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'
import { ensureAdmin } from '@/lib/auth/admin'

function periodStart(period: 'weekly' | 'monthly' | 'all-time') {
  const now = new Date()

  if (period === 'monthly') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  }

  if (period === 'weekly') {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const weekday = d.getUTCDay()
    const diff = weekday === 0 ? -6 : 1 - weekday
    d.setUTCDate(d.getUTCDate() + diff)
    return d.toISOString()
  }

  return '1970-01-01T00:00:00.000Z'
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

  const adminGate = await ensureAdmin(supabase, user.id)
  if (!adminGate.ok) {
    return NextResponse.json({ success: false, error: adminGate.message }, { status: adminGate.status })
  }

  const weeklyStart = periodStart('weekly')
  const monthlyStart = periodStart('monthly')

  const [
    { count: categoryCount, error: categoryError },
    { count: questionCount, error: questionError },
    { count: activeQuestionCount, error: activeQuestionError },
    { count: totalAttempts, error: attemptsError },
    { data: weeklyAttempts, error: weeklyError },
    { data: monthlyAttempts, error: monthlyError },
  ] = await Promise.all([
    supabase.from('quiz_categories').select('slug', { count: 'exact', head: true }),
    supabase.from('quiz_questions').select('id', { count: 'exact', head: true }),
    supabase.from('quiz_questions').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }),
    supabase
      .from('quiz_attempts')
      .select('score_percent, points_earned')
      .gte('created_at', weeklyStart),
    supabase
      .from('quiz_attempts')
      .select('score_percent, points_earned')
      .gte('created_at', monthlyStart),
  ])

  const firstError = categoryError || questionError || activeQuestionError || attemptsError || weeklyError || monthlyError
  if (firstError) {
    return NextResponse.json({ success: false, error: firstError.message }, { status: 400 })
  }

  const weeklyRows = weeklyAttempts ?? []
  const monthlyRows = monthlyAttempts ?? []

  const weeklyAvgScore =
    weeklyRows.length > 0
      ? Math.round((weeklyRows.reduce((sum, row) => sum + Number(row.score_percent ?? 0), 0) / weeklyRows.length) * 100) / 100
      : 0

  const monthlyAvgScore =
    monthlyRows.length > 0
      ? Math.round((monthlyRows.reduce((sum, row) => sum + Number(row.score_percent ?? 0), 0) / monthlyRows.length) * 100) / 100
      : 0

  return NextResponse.json(
    {
      success: true,
      stats: {
        categories: categoryCount ?? 0,
        questions: questionCount ?? 0,
        activeQuestions: activeQuestionCount ?? 0,
        attempts: totalAttempts ?? 0,
        weeklyAttempts: weeklyRows.length,
        weeklyAverageScore: weeklyAvgScore,
        monthlyAverageScore: monthlyAvgScore,
      },
    },
    { headers: response.headers },
  )
}
