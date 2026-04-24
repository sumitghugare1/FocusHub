import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

type LeaderboardPeriod = 'weekly' | 'monthly' | 'all-time'

type QuizLeaderboardEntry = {
  rank: number
  userId: string
  userName: string
  userAvatar?: string
  attempts: number
  totalPoints: number
  averageScore: number
  bestScore: number
}

function normalizePeriod(raw: string | null): LeaderboardPeriod {
  if (raw === 'weekly' || raw === 'monthly' || raw === 'all-time') return raw
  return 'weekly'
}

function getPeriodStart(period: LeaderboardPeriod): string {
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

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100
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
  const period = normalizePeriod(request.nextUrl.searchParams.get('period'))
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 50) || 50, 200)
  const periodStart = getPeriodStart(period)

  let query = supabase
    .from('quiz_attempts')
    .select('user_id, points_earned, score_percent, created_at')
    .gte('created_at', periodStart)

  if (category && category !== 'all') {
    query = query.eq('category_slug', category)
  }

  const { data: attempts, error: attemptsError } = await query

  if (attemptsError) {
    return NextResponse.json({ success: false, error: attemptsError.message }, { status: 400 })
  }

  if (!attempts || attempts.length === 0) {
    return NextResponse.json(
      {
        success: true,
        period,
        category: category ?? 'all',
        currentUserRank: 0,
        entries: [],
      },
      { headers: response.headers },
    )
  }

  const userIds = Array.from(new Set(attempts.map((attempt) => attempt.user_id)))

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url')
    .in('id', userIds)

  if (profilesError) {
    return NextResponse.json({ success: false, error: profilesError.message }, { status: 400 })
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      {
        userName: profile.full_name || profile.username || 'User',
        userAvatar: profile.avatar_url ?? undefined,
      },
    ]),
  )

  const aggregates = new Map<
    string,
    {
      attempts: number
      totalPoints: number
      totalScore: number
      bestScore: number
    }
  >()

  for (const attempt of attempts) {
    const current = aggregates.get(attempt.user_id) ?? {
      attempts: 0,
      totalPoints: 0,
      totalScore: 0,
      bestScore: 0,
    }

    current.attempts += 1
    current.totalPoints += attempt.points_earned ?? 0
    current.totalScore += Number(attempt.score_percent ?? 0)
    current.bestScore = Math.max(current.bestScore, Number(attempt.score_percent ?? 0))

    aggregates.set(attempt.user_id, current)
  }

  const entries: QuizLeaderboardEntry[] = Array.from(aggregates.entries()).map(([userId, stat]) => {
    const profile = profileMap.get(userId)
    return {
      rank: 0,
      userId,
      userName: profile?.userName ?? 'User',
      userAvatar: profile?.userAvatar,
      attempts: stat.attempts,
      totalPoints: stat.totalPoints,
      averageScore: roundToTwo(stat.totalScore / stat.attempts),
      bestScore: roundToTwo(stat.bestScore),
    }
  })

  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore
    return a.userName.localeCompare(b.userName)
  })

  const ranked = entries.map((entry, index) => ({ ...entry, rank: index + 1 }))
  const currentUserRank = ranked.find((entry) => entry.userId === user.id)?.rank ?? 0

  return NextResponse.json(
    {
      success: true,
      period,
      category: category ?? 'all',
      currentUserRank,
      entries: ranked.slice(0, limit),
    },
    { headers: response.headers },
  )
}
