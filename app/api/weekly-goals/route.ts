import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'

const updateSchema = z.object({
  targetFocusHours: z.number().int().min(1).max(100),
  targetSessions: z.number().int().min(1).max(300),
  targetStreakDays: z.number().int().min(1).max(7),
})

function getWeekStart(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
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

  const weekStart = getWeekStart(new Date())

  const { data: goal, error } = await supabase
    .from('weekly_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json(
    {
      success: true,
      weeklyGoal: goal
        ? {
            weekStart,
            targetFocusHours: goal.target_focus_hours,
            targetSessions: goal.target_sessions,
            targetStreakDays: goal.target_streak_days,
            achievedFocusHours: goal.achieved_focus_hours,
            achievedSessions: goal.achieved_sessions,
            achievedStreakDays: goal.achieved_streak_days,
            progressPercentage: goal.progress_percentage,
          }
        : {
            weekStart,
            targetFocusHours: 20,
            targetSessions: 40,
            targetStreakDays: 5,
            achievedFocusHours: 0,
            achievedSessions: 0,
            achievedStreakDays: 0,
            progressPercentage: 0,
          },
    },
    { headers: response.headers },
  )
}

export async function PATCH(request: NextRequest) {
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
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  const weekStart = getWeekStart(new Date())

  const { data: existing } = await supabase
    .from('weekly_goals')
    .select('achieved_focus_hours, achieved_sessions, achieved_streak_days')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .maybeSingle()

  const achievedFocusHours = existing?.achieved_focus_hours ?? 0
  const achievedSessions = existing?.achieved_sessions ?? 0
  const achievedStreakDays = existing?.achieved_streak_days ?? 0

  const focusProgress = Math.min(
    100,
    Math.round((achievedFocusHours / parsed.data.targetFocusHours) * 100),
  )
  const sessionsProgress = Math.min(
    100,
    Math.round((achievedSessions / parsed.data.targetSessions) * 100),
  )
  const streakProgress = Math.min(
    100,
    Math.round((achievedStreakDays / parsed.data.targetStreakDays) * 100),
  )
  const progressPercentage = Math.round((focusProgress + sessionsProgress + streakProgress) / 3)

  const { error } = await supabase.from('weekly_goals').upsert(
    {
      user_id: user.id,
      week_start: weekStart,
      target_focus_hours: parsed.data.targetFocusHours,
      target_sessions: parsed.data.targetSessions,
      target_streak_days: parsed.data.targetStreakDays,
      achieved_focus_hours: achievedFocusHours,
      achieved_sessions: achievedSessions,
      achieved_streak_days: achievedStreakDays,
      progress_percentage: progressPercentage,
    },
    { onConflict: 'user_id,week_start' },
  )

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}
