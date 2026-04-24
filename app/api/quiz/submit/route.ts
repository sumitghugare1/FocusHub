import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'

const submitQuizSchema = z.object({
  categorySlug: z.string().trim().min(1),
  timeLimitSeconds: z.number().int().positive(),
  timeSpentSeconds: z.number().int().nonnegative(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOption: z.number().int().min(0).max(3).nullable(),
    }),
  ).min(1),
})

function calculateLevelFromXp(xp: number): number {
  return Math.floor(xp / 1000) + 1
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100
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

  const body = await request.json().catch(() => null)
  const parsed = submitQuizSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  const payload = parsed.data
  const questionIds = Array.from(new Set(payload.answers.map((item) => item.questionId)))

  const { data: categoryRow } = await supabase
    .from('quiz_categories')
    .select('slug, is_active')
    .eq('slug', payload.categorySlug)
    .maybeSingle()

  if (!categoryRow || !categoryRow.is_active) {
    return NextResponse.json({ success: false, error: 'Invalid category' }, { status: 400 })
  }

  const { data: questionRows, error: questionError } = await supabase
    .from('quiz_questions')
    .select('id, correct_option, explanation, question')
    .in('id', questionIds)
    .eq('category_slug', payload.categorySlug)
    .eq('is_active', true)

  if (questionError) {
    return NextResponse.json({ success: false, error: questionError.message }, { status: 400 })
  }

  const questionMap = new Map((questionRows ?? []).map((row) => [row.id, row]))

  if (questionMap.size !== questionIds.length) {
    return NextResponse.json({ success: false, error: 'One or more questions are invalid' }, { status: 400 })
  }

  let correctAnswers = 0
  const feedback = payload.answers.map((answer) => {
    const question = questionMap.get(answer.questionId)
    const isCorrect = Boolean(question && answer.selectedOption === question.correct_option)

    if (isCorrect) {
      correctAnswers += 1
    }

    return {
      questionId: answer.questionId,
      question: question?.question ?? '',
      selectedOption: answer.selectedOption,
      correctOption: question?.correct_option ?? null,
      isCorrect,
      explanation: question?.explanation ?? null,
    }
  })

  const totalQuestions = payload.answers.length
  const scorePercent = roundToTwo((correctAnswers / totalQuestions) * 100)
  const boundedTimeSpent = Math.min(payload.timeSpentSeconds, payload.timeLimitSeconds)

  const basePoints = correctAnswers * 10
  const timeBonus = Math.max(0, Math.floor((payload.timeLimitSeconds - boundedTimeSpent) / 10))
  const accuracyBonus = scorePercent >= 90 ? 30 : scorePercent >= 75 ? 15 : scorePercent >= 60 ? 5 : 0
  const pointsEarned = basePoints + timeBonus + accuracyBonus

  const { error: attemptError } = await supabase.from('quiz_attempts').insert({
    user_id: user.id,
    category_slug: payload.categorySlug,
    total_questions: totalQuestions,
    correct_answers: correctAnswers,
    score_percent: scorePercent,
    points_earned: pointsEarned,
    time_limit_seconds: payload.timeLimitSeconds,
    time_spent_seconds: boundedTimeSpent,
    answers: payload.answers,
  })

  if (attemptError) {
    return NextResponse.json({ success: false, error: attemptError.message }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, xp, level, email, username')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    const username = user.email?.split('@')[0] ?? `user_${user.id.slice(0, 8)}`
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? null,
        username,
      },
      { onConflict: 'id' },
    )
  }

  const currentXp = profile?.xp ?? 0
  const nextXp = currentXp + pointsEarned
  const nextLevel = calculateLevelFromXp(nextXp)

  await supabase
    .from('profiles')
    .update({
      xp: nextXp,
      level: nextLevel,
      last_active_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  return NextResponse.json(
    {
      success: true,
      result: {
        categorySlug: payload.categorySlug,
        totalQuestions,
        correctAnswers,
        scorePercent,
        pointsEarned,
        timeLimitSeconds: payload.timeLimitSeconds,
        timeSpentSeconds: boundedTimeSpent,
        nextXp,
        nextLevel,
      },
      feedback,
    },
    { headers: response.headers },
  )
}
