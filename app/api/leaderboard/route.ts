import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

type LeaderboardPeriod = 'weekly' | 'monthly' | 'all-time'
type LeaderboardPeriodType = 'weekly' | 'monthly' | 'all_time'

type LeaderboardEntry = {
  rank: number
  userId: string
  userName: string
  userAvatar?: string
  totalMinutes: number
  streak: number
  level: number
  xp: number
}

function normalizePeriod(raw: string | null): LeaderboardPeriod {
  if (raw === 'weekly' || raw === 'monthly' || raw === 'all-time') return raw
  return 'weekly'
}

function getWeeklyStartUtc(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const weekday = d.getUTCDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

function getMonthlyStartUtc(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10)
}

function getPeriodConfig(period: LeaderboardPeriod) {
  if (period === 'weekly') {
    return {
      periodType: 'weekly' as LeaderboardPeriodType,
      periodStart: getWeeklyStartUtc(new Date()),
    }
  }

  if (period === 'monthly') {
    return {
      periodType: 'monthly' as LeaderboardPeriodType,
      periodStart: getMonthlyStartUtc(new Date()),
    }
  }

  return {
    periodType: 'all_time' as LeaderboardPeriodType,
    periodStart: '1970-01-01',
  }
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

  const period = normalizePeriod(request.nextUrl.searchParams.get('period'))
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 50) || 50, 200)
  const { periodType, periodStart } = getPeriodConfig(period)

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, level, xp, current_streak, total_focus_time')

  if (profileError) {
    return NextResponse.json({ success: false, error: profileError.message }, { status: 400 })
  }

  const profileById = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      {
        userName: profile.full_name || profile.username || 'User',
        userAvatar: profile.avatar_url ?? undefined,
        level: profile.level ?? 1,
        xp: profile.xp ?? 0,
        streak: profile.current_streak ?? 0,
        allTimeMinutes: profile.total_focus_time ?? 0,
      },
    ]),
  )

  const { data: leaderboardRows, error: leaderboardError } = await supabase
    .from('leaderboard_entries')
    .select('user_id, total_focus_minutes, longest_streak, xp_earned')
    .eq('period_type', periodType)
    .eq('period_start', periodStart)

  if (leaderboardError) {
    return NextResponse.json({ success: false, error: leaderboardError.message }, { status: 400 })
  }

  const rowByUser = new Map((leaderboardRows ?? []).map((row) => [row.user_id, row]))
  const entries: LeaderboardEntry[] = []

  if (period === 'all-time' && rowByUser.size === 0) {
    for (const [userId, profile] of profileById.entries()) {
      entries.push({
        rank: 0,
        userId,
        userName: profile.userName,
        userAvatar: profile.userAvatar,
        totalMinutes: profile.allTimeMinutes,
        streak: profile.streak,
        level: profile.level,
        xp: profile.xp,
      })
    }
  } else {
    for (const [userId, row] of rowByUser.entries()) {
      const profile = profileById.get(userId)
      if (!profile) continue

      entries.push({
        rank: 0,
        userId,
        userName: profile.userName,
        userAvatar: profile.userAvatar,
        totalMinutes: row.total_focus_minutes ?? 0,
        streak: row.longest_streak ?? profile.streak,
        level: profile.level,
        xp: row.xp_earned ?? profile.xp,
      })
    }
  }

  entries.sort((a, b) => {
    if (b.totalMinutes !== a.totalMinutes) return b.totalMinutes - a.totalMinutes
    if (b.streak !== a.streak) return b.streak - a.streak
    if (b.xp !== a.xp) return b.xp - a.xp
    return a.userName.localeCompare(b.userName)
  })

  const ranked = entries.map((entry, index) => ({ ...entry, rank: index + 1 }))
  const sliced = ranked.slice(0, limit)
  const currentUserRank = ranked.find((entry) => entry.userId === user.id)?.rank ?? 0

  return NextResponse.json(
    {
      success: true,
      period,
      currentUserRank,
      entries: sliced,
    },
    { headers: response.headers },
  )
}