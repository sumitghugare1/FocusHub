import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'

const createSessionSchema = z.object({
  roomId: z.string().uuid().optional().nullable(),
  sessionType: z.enum(['focus', 'short_break', 'long_break']),
  plannedDuration: z.number().int().positive(),
  actualDuration: z.number().int().nonnegative(),
  status: z.enum(['completed', 'abandoned']).default('completed'),
  taskName: z.string().trim().max(200).optional().nullable(),
  taskCategory: z.string().trim().max(100).optional().nullable(),
})

type RequirementMap = Record<string, number>

function requirementsToMap(value: unknown): RequirementMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const mapped: RequirementMap = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      mapped[key] = raw
    }
  }
  return mapped
}

function calculateLevelFromXp(xp: number): number {
  return Math.floor(xp / 1000) + 1
}

function getDateInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

function getWeekStartFromDate(dateIso: string): string {
  const [year, month, day] = dateIso.split('-').map(Number)
  const d = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1))
  const weekday = d.getUTCDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

function getMonthStartFromDate(dateIso: string): string {
  const [year, month] = dateIso.split('-').map(Number)
  const d = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, 1))
  return d.toISOString().slice(0, 10)
}

function getHourInTimezone(timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  return Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
}

function getWeekdayInTimezone(timezone: string): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(new Date())

  if (weekday === 'Sun') return 0
  if (weekday === 'Mon') return 1
  if (weekday === 'Tue') return 2
  if (weekday === 'Wed') return 3
  if (weekday === 'Thu') return 4
  if (weekday === 'Fri') return 5
  return 6
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
  const parsed = createSessionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  const payload = parsed.data
  const nowIso = new Date().toISOString()

  let { data: profileBase } = await supabase
    .from('profiles')
    .select('timezone, total_focus_time, total_sessions, current_streak, longest_streak, xp, level')
    .eq('id', user.id)
    .maybeSingle()

  if (!profileBase) {
    const username = user.email?.split('@')[0] ?? `user_${user.id.slice(0, 8)}`
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? null,
        username,
      },
      { onConflict: 'id' },
    )

    const { data: createdProfile } = await supabase
      .from('profiles')
      .select('timezone, total_focus_time, total_sessions, current_streak, longest_streak, xp, level')
      .eq('id', user.id)
      .maybeSingle()

    profileBase =
      createdProfile ??
      ({
        timezone: 'UTC',
        total_focus_time: 0,
        total_sessions: 0,
        current_streak: 0,
        longest_streak: 0,
        xp: 0,
        level: 1,
      } as typeof createdProfile)
  }

  const timezone = profileBase?.timezone ?? 'UTC'

  const { data: createdSession, error: createError } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: user.id,
      room_id: payload.roomId ?? null,
      session_type: payload.sessionType,
      planned_duration: payload.plannedDuration,
      actual_duration: payload.actualDuration,
      status: payload.status,
      task_name: payload.taskName ?? null,
      task_category: payload.taskCategory ?? null,
      ended_at: nowIso,
    })
    .select('id')
    .single()

  if (createError) {
    return NextResponse.json({ success: false, error: createError.message }, { status: 400 })
  }

  const today = getDateInTimezone(timezone)
  const isCompleted = payload.status === 'completed'
  const focusMinutes = isCompleted && payload.sessionType === 'focus' ? payload.actualDuration : 0
  const breakMinutes =
    isCompleted && (payload.sessionType === 'short_break' || payload.sessionType === 'long_break')
      ? payload.actualDuration
      : 0

  const { data: todayStats } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle()

  const nextDailyStats = {
    user_id: user.id,
    date: today,
    focus_sessions: (todayStats?.focus_sessions ?? 0) + (payload.sessionType === 'focus' ? 1 : 0),
    completed_sessions: (todayStats?.completed_sessions ?? 0) + (isCompleted ? 1 : 0),
    abandoned_sessions: (todayStats?.abandoned_sessions ?? 0) + (payload.status === 'abandoned' ? 1 : 0),
    total_focus_minutes: (todayStats?.total_focus_minutes ?? 0) + focusMinutes,
    total_break_minutes: (todayStats?.total_break_minutes ?? 0) + breakMinutes,
    longest_session_minutes: Math.max(todayStats?.longest_session_minutes ?? 0, focusMinutes),
    maintained_streak: Boolean((todayStats?.maintained_streak ?? false) || focusMinutes > 0),
  }

  const { error: dailyError } = await supabase.from('daily_stats').upsert(nextDailyStats, {
    onConflict: 'user_id,date',
  })

  if (dailyError) {
    return NextResponse.json({ success: false, error: dailyError.message }, { status: 400 })
  }

  if (focusMinutes > 0) {
    const { data: streakRows } = await supabase
      .from('daily_stats')
      .select('date')
      .eq('user_id', user.id)
      .eq('maintained_streak', true)
      .order('date', { ascending: false })
      .limit(400)

    let currentStreak = 0
    let cursor = new Date(`${today}T00:00:00.000Z`)
    const streakDates = new Set((streakRows ?? []).map((row) => row.date))

    while (streakDates.has(cursor.toISOString().slice(0, 10))) {
      currentStreak += 1
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }

    const longestStreak = Math.max(profileBase?.longest_streak ?? 0, currentStreak)

    const baseXp = 25
    let totalXpGain = baseXp
    const nextTotalSessions = (profileBase?.total_sessions ?? 0) + 1
    const nextTotalFocusTime = (profileBase?.total_focus_time ?? 0) + focusMinutes
    let nextXp = profileBase?.xp ?? 0

    const { data: achievements } = await supabase
      .from('achievements')
      .select('id, xp_reward, requirements')
      .eq('is_active', true)

    const { data: existingEarned } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id)

    const earnedIds = new Set((existingEarned ?? []).map((item) => item.achievement_id))
    const newlyEarnedIds: string[] = []

    let weekendCompletedSessions = 0
    const weekday = getWeekdayInTimezone(timezone)
    if (weekday === 0 || weekday === 6) {
      const { data: weekendRows } = await supabase
        .from('focus_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('session_type', 'focus')
        .eq('status', 'completed')

      weekendCompletedSessions = (weekendRows?.length ?? 0) + 1
    }

    const hourInTimezone = getHourInTimezone(timezone)

    for (const achievement of achievements ?? []) {
      if (earnedIds.has(achievement.id)) continue

      const req = requirementsToMap(achievement.requirements)
      let matched = false

      if (typeof req.total_sessions === 'number' && nextTotalSessions >= req.total_sessions) matched = true
      if (typeof req.total_minutes === 'number' && nextTotalFocusTime >= req.total_minutes) matched = true
      if (typeof req.streak_days === 'number' && currentStreak >= req.streak_days) matched = true
      if (typeof req.consecutive_days === 'number' && currentStreak >= req.consecutive_days) matched = true
      if (typeof req.session_minutes === 'number' && focusMinutes >= req.session_minutes) matched = true
      if (typeof req.session_before_hour === 'number' && hourInTimezone < req.session_before_hour) matched = true
      if (typeof req.session_after_hour === 'number' && hourInTimezone >= req.session_after_hour) matched = true
      if (typeof req.weekend_sessions === 'number' && weekendCompletedSessions >= req.weekend_sessions) matched = true

      const projectedLevel = calculateLevelFromXp(nextXp + totalXpGain)
      if (typeof req.level === 'number' && projectedLevel >= req.level) matched = true

      if (!matched) continue

      newlyEarnedIds.push(achievement.id)
      totalXpGain += achievement.xp_reward ?? 0
    }

    nextXp += totalXpGain
    const nextLevel = calculateLevelFromXp(nextXp)

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        total_focus_time: nextTotalFocusTime,
        total_sessions: nextTotalSessions,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        xp: nextXp,
        level: nextLevel,
        last_active_at: nowIso,
      })
      .eq('id', user.id)

    if (profileUpdateError) {
      return NextResponse.json({ success: false, error: profileUpdateError.message }, { status: 400 })
    }

    const updateLeaderboardEntry = async (
      periodType: 'weekly' | 'monthly' | 'all_time',
      periodStart: string,
      startIso?: string,
    ) => {
      let sessionsQuery = supabase
        .from('focus_sessions')
        .select('actual_duration')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .eq('session_type', 'focus')

      if (startIso) {
        sessionsQuery = sessionsQuery.gte('ended_at', startIso)
      }

      const { data: rows, error: rowsError } = await sessionsQuery
      if (rowsError) return

      const totalFocusMinutes = (rows ?? []).reduce((sum, row) => sum + (row.actual_duration ?? 0), 0)
      const totalSessions = rows?.length ?? 0

      await supabase.from('leaderboard_entries').upsert(
        {
          user_id: user.id,
          period_type: periodType,
          period_start: periodStart,
          total_focus_minutes: totalFocusMinutes,
          total_sessions: totalSessions,
          longest_streak: currentStreak,
          xp_earned: nextXp,
          rank: null,
        },
        { onConflict: 'user_id,period_type,period_start' },
      )
    }

    const monthStart = getMonthStartFromDate(today)

    await Promise.allSettled([
      updateLeaderboardEntry('weekly', getWeekStartFromDate(today), `${getWeekStartFromDate(today)}T00:00:00.000Z`),
      updateLeaderboardEntry('monthly', monthStart, `${monthStart}T00:00:00.000Z`),
      updateLeaderboardEntry('all_time', '1970-01-01'),
    ])

    if (newlyEarnedIds.length > 0) {
      await supabase.from('user_achievements').upsert(
        newlyEarnedIds.map((achievementId) => ({
          user_id: user.id,
          achievement_id: achievementId,
        })),
        { onConflict: 'user_id,achievement_id' },
      )

      await supabase.from('activity_feed').insert(
        newlyEarnedIds.map((achievementId) => ({
          user_id: user.id,
          type: 'achievement_earned',
          description: 'Earned a new achievement',
          related_type: 'achievement',
          related_id: achievementId,
          is_public: true,
        })),
      )
    }

    const previousLevel = profileBase?.level ?? 1
    if (nextLevel > previousLevel) {
      await supabase.from('activity_feed').insert({
        user_id: user.id,
        type: 'level_up',
        description: `Reached level ${nextLevel}`,
        related_type: 'profile',
        is_public: true,
      })
    }

    const previousStreak = profileBase?.current_streak ?? 0
    if (currentStreak > previousStreak && currentStreak > 0 && currentStreak % 7 === 0) {
      await supabase.from('activity_feed').insert({
        user_id: user.id,
        type: 'streak_milestone',
        description: `Reached a ${currentStreak}-day streak`,
        related_type: 'streak',
        is_public: true,
      })
    }

    await supabase.from('activity_feed').insert({
      user_id: user.id,
      type: 'session_completed',
      description: `Completed a ${focusMinutes}-minute focus session`,
      related_type: 'focus_session',
      related_id: createdSession.id,
      is_public: true,
    })
  }

  const weekStart = getWeekStartFromDate(today)
  const weekEnd = new Date(`${weekStart}T00:00:00.000Z`)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

  const { data: weeklyRows } = await supabase
    .from('daily_stats')
    .select('total_focus_minutes, completed_sessions, maintained_streak')
    .eq('user_id', user.id)
    .gte('date', weekStart)
    .lt('date', weekEnd.toISOString().slice(0, 10))

  const weeklyFocusMinutes = (weeklyRows ?? []).reduce((acc, row) => acc + row.total_focus_minutes, 0)
  const weeklyCompletedSessions = (weeklyRows ?? []).reduce((acc, row) => acc + row.completed_sessions, 0)
  const weeklyStreakDays = (weeklyRows ?? []).reduce(
    (acc, row) => acc + (row.maintained_streak ? 1 : 0),
    0,
  )

  const { data: existingWeeklyGoal } = await supabase
    .from('weekly_goals')
    .select('target_focus_hours, target_sessions, target_streak_days')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .maybeSingle()

  const targetFocusHours = existingWeeklyGoal?.target_focus_hours ?? 20
  const targetSessions = existingWeeklyGoal?.target_sessions ?? 40
  const targetStreakDays = existingWeeklyGoal?.target_streak_days ?? 5

  const focusProgress = Math.min(
    100,
    Math.round((Math.floor(weeklyFocusMinutes / 60) / Math.max(1, targetFocusHours)) * 100),
  )
  const sessionsProgress = Math.min(
    100,
    Math.round((weeklyCompletedSessions / Math.max(1, targetSessions)) * 100),
  )
  const streakProgress = Math.min(
    100,
    Math.round((weeklyStreakDays / Math.max(1, targetStreakDays)) * 100),
  )
  const progressPercentage = Math.round((focusProgress + sessionsProgress + streakProgress) / 3)

  const { error: weeklyError } = await supabase.from('weekly_goals').upsert(
    {
      user_id: user.id,
      week_start: weekStart,
      target_focus_hours: targetFocusHours,
      target_sessions: targetSessions,
      target_streak_days: targetStreakDays,
      achieved_focus_hours: Math.floor(weeklyFocusMinutes / 60),
      achieved_sessions: weeklyCompletedSessions,
      achieved_streak_days: weeklyStreakDays,
      progress_percentage: progressPercentage,
    },
    { onConflict: 'user_id,week_start' },
  )

  if (weeklyError) {
    return NextResponse.json({ success: false, error: weeklyError.message }, { status: 400 })
  }

  return NextResponse.json(
    {
      success: true,
      sessionId: createdSession.id,
      dailyStats: nextDailyStats,
      weeklyGoal: {
        weekStart,
        achievedFocusHours: Math.floor(weeklyFocusMinutes / 60),
        achievedSessions: weeklyCompletedSessions,
        achievedStreakDays: weeklyStreakDays,
        progressPercentage,
      },
    },
    { headers: response.headers },
  )
}
