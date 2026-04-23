import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'
import { getDateInTimezone, getWeekStartFromDate } from '@/lib/ai/coach'
import { isEmailConfigured, sendCoachNudgeEmail } from '@/lib/notifications/email'
import { normalizeNotificationPreferences } from '@/lib/notifications/preferences'

const requestSchema = z.object({
  dryRun: z.boolean().default(false),
})

type SuggestedNudge = {
  type: 'streak_reminder' | 'weekly_report'
  title: string
  message: string
  action: string
}

function getDayOfWeekInTimezone(timezone: string): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(new Date())

  if (weekday === 'Mon') return 1
  if (weekday === 'Tue') return 2
  if (weekday === 'Wed') return 3
  if (weekday === 'Thu') return 4
  if (weekday === 'Fri') return 5
  if (weekday === 'Sat') return 6
  return 7
}

function getHourInTimezone(timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  return Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
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

  const payload = requestSchema.safeParse(await request.json().catch(() => null))
  if (!payload.success) {
    return NextResponse.json(
      { success: false, error: payload.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('timezone, settings, current_streak, email, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ success: false, error: profileError.message }, { status: 400 })
  }

  const timezone = profile?.timezone ?? 'UTC'
  const today = getDateInTimezone(timezone)
  const weekStart = getWeekStartFromDate(today)

  const [todayStatsResult, weeklyGoalResult, existingNudgesResult] = await Promise.all([
    supabase
      .from('daily_stats')
      .select('completed_sessions, total_focus_minutes')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle(),
    supabase
      .from('weekly_goals')
      .select('target_focus_hours, achieved_focus_hours, target_sessions, achieved_sessions, progress_percentage')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .maybeSingle(),
    supabase
      .from('notifications')
      .select('type, created_at')
      .eq('user_id', user.id)
      .in('type', ['streak_reminder', 'weekly_report'])
      .gte('created_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()),
  ])

  if (todayStatsResult.error || weeklyGoalResult.error || existingNudgesResult.error) {
    const error = todayStatsResult.error ?? weeklyGoalResult.error ?? existingNudgesResult.error
    return NextResponse.json({ success: false, error: error?.message ?? 'Unable to evaluate nudges' }, { status: 400 })
  }

  const existingTypes = new Set((existingNudgesResult.data ?? []).map((item) => item.type))
  const preferences = normalizeNotificationPreferences(profile?.settings)
  const currentHour = getHourInTimezone(timezone)
  const weekday = getDayOfWeekInTimezone(timezone)

  const nudges: SuggestedNudge[] = []

  const completedToday = todayStatsResult.data?.completed_sessions ?? 0
  const streak = profile?.current_streak ?? 0

  if (
    preferences.inApp.streakReminder &&
    streak > 0 &&
    completedToday === 0 &&
    currentHour >= 18 &&
    !existingTypes.has('streak_reminder')
  ) {
    nudges.push({
      type: 'streak_reminder',
      title: 'Protect your streak tonight',
      message: `You are on a ${streak}-day streak. Complete one 20-minute focus session to keep it alive.`,
      action: 'Start a 20-minute focus block now and finish one priority task.',
    })
  }

  const weeklyGoal = weeklyGoalResult.data
  if (preferences.inApp.weeklyReport && weeklyGoal && !existingTypes.has('weekly_report')) {
    const expectedProgress = Math.round((weekday / 7) * 100)
    const progress = weeklyGoal.progress_percentage ?? 0

    if (progress + 12 < expectedProgress && weekday >= 4) {
      const missingHours = Math.max(0, (weeklyGoal.target_focus_hours ?? 0) - (weeklyGoal.achieved_focus_hours ?? 0))
      nudges.push({
        type: 'weekly_report',
        title: 'Weekly goal needs a catch-up push',
        message: `You are at ${progress}% of your weekly target. Around ${missingHours} focus hours are still pending.`,
        action: 'Schedule two focused blocks today and one tomorrow to recover momentum.',
      })
    }
  }

  if (payload.data.dryRun || nudges.length === 0) {
    return NextResponse.json(
      {
        success: true,
        dryRun: payload.data.dryRun,
        nudges,
      },
      { headers: response.headers },
    )
  }

  const rows = nudges.map((nudge) => ({
    user_id: user.id,
    type: nudge.type,
    title: nudge.title,
    message: nudge.message,
    related_type: 'ai_coach',
    data: {
      action: nudge.action,
      createdBy: 'ai-coach',
    },
  }))

  const { error: insertError } = await supabase.from('notifications').insert(rows)
  if (insertError) {
    return NextResponse.json({ success: false, error: insertError.message }, { status: 400 })
  }

  if (isEmailConfigured() && profile?.email && preferences.email.weeklyReport) {
    for (const nudge of nudges) {
      await sendCoachNudgeEmail({
        to: profile.email,
        userName: profile.full_name ?? user.email?.split('@')[0] ?? 'there',
        title: nudge.title,
        message: nudge.message,
        action: nudge.action,
        dashboardUrl: new URL('/coach', request.nextUrl.origin).toString(),
      })
    }
  }

  return NextResponse.json(
    {
      success: true,
      dryRun: false,
      nudges,
    },
    { headers: response.headers },
  )
}
