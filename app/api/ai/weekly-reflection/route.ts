import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'
import {
  buildRuleBasedWeeklyReflection,
  getDateInTimezone,
  getWeekStartFromDate,
  WeeklyReflectionSchema,
} from '@/lib/ai/coach'
import { generateGeminiJson } from '@/lib/ai/gemini'

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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ success: false, error: profileError.message }, { status: 400 })
  }

  const timezone = profile?.timezone ?? 'UTC'
  const today = getDateInTimezone(timezone)
  const weekStart = getWeekStartFromDate(today)

  const weekEndDate = new Date(`${weekStart}T00:00:00.000Z`)
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7)
  const weekEnd = weekEndDate.toISOString().slice(0, 10)

  const [dailyResult, sessionsResult] = await Promise.all([
    supabase
      .from('daily_stats')
      .select('total_focus_minutes, completed_sessions, abandoned_sessions')
      .eq('user_id', user.id)
      .gte('date', weekStart)
      .lt('date', weekEnd),
    supabase
      .from('focus_sessions')
      .select('task_category')
      .eq('user_id', user.id)
      .eq('session_type', 'focus')
      .eq('status', 'completed')
      .gte('started_at', `${weekStart}T00:00:00.000Z`)
      .lt('started_at', `${weekEnd}T00:00:00.000Z`),
  ])

  if (dailyResult.error || sessionsResult.error) {
    const error = dailyResult.error ?? sessionsResult.error
    return NextResponse.json({ success: false, error: error?.message ?? 'Unable to compute reflection' }, { status: 400 })
  }

  const daily = dailyResult.data ?? []
  const focusMinutes = daily.reduce((sum, row) => sum + (row.total_focus_minutes ?? 0), 0)
  const completedSessions = daily.reduce((sum, row) => sum + (row.completed_sessions ?? 0), 0)
  const abandonedSessions = daily.reduce((sum, row) => sum + (row.abandoned_sessions ?? 0), 0)

  const totalSessions = completedSessions + abandonedSessions
  const completionRate = totalSessions > 0 ? completedSessions / totalSessions : 0

  const categoryCounts = new Map<string, number>()
  for (const row of sessionsResult.data ?? []) {
    const key = row.task_category?.trim() || 'uncategorized'
    categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1)
  }

  const topTaskCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 4)

  const fallbackReflection = buildRuleBasedWeeklyReflection({
    weekStart,
    focusMinutes,
    completedSessions,
    abandonedSessions,
    completionRate,
    topTaskCategories,
  })

  const prompt = `You are a study performance coach. Return JSON only in this shape:
{
  "weekStart": "YYYY-MM-DD",
  "summary": "string",
  "whatWorked": ["string"],
  "whereTimeWasLost": ["string"],
  "nextWeekAdjustments": ["string"],
  "metrics": {
    "focusMinutes": number,
    "completedSessions": number,
    "abandonedSessions": number,
    "completionRate": number
  }
}

Data:
- weekStart: ${weekStart}
- focusMinutes: ${focusMinutes}
- completedSessions: ${completedSessions}
- abandonedSessions: ${abandonedSessions}
- completionRate: ${completionRate}
- topTaskCategories: ${JSON.stringify(topTaskCategories)}
`

  const generated = await generateGeminiJson({
    prompt,
    fallback: fallbackReflection,
    schema: WeeklyReflectionSchema,
  })

  const { error: saveError } = await supabase.from('ai_weekly_reflections').upsert(
    {
      user_id: user.id,
      week_start: weekStart,
      reflection_json: generated.data,
      source: generated.source,
    },
    { onConflict: 'user_id,week_start' },
  )

  return NextResponse.json(
    {
      success: true,
      reflection: generated.data,
      source: generated.source,
      warning: saveError?.message ?? null,
    },
    { headers: response.headers },
  )
}
