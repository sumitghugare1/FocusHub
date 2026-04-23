import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'
import {
  buildRuleBasedDailyPlan,
  computeSessionRecommendation,
  DailyPlanSchema,
  getDateInTimezone,
} from '@/lib/ai/coach'
import { generateGeminiJson } from '@/lib/ai/gemini'

const requestSchema = z.object({
  availableMinutes: z.number().int().min(30).max(720).default(180),
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  save: z.boolean().default(true),
})

function getDailyGoalTargets(settings: unknown) {
  const raw = (settings ?? {}) as Record<string, unknown>
  const goals = (raw.goals ?? {}) as Record<string, unknown>
  const daily = (goals.daily ?? {}) as Record<string, unknown>

  return {
    targetFocusHours:
      typeof daily.targetFocusHours === 'number' && Number.isFinite(daily.targetFocusHours)
        ? daily.targetFocusHours
        : 4,
    targetSessions:
      typeof daily.targetSessions === 'number' && Number.isFinite(daily.targetSessions)
        ? daily.targetSessions
        : 8,
  }
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

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('timezone, settings')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ success: false, error: profileError.message }, { status: 400 })
  }

  const timezone = profile?.timezone ?? 'UTC'
  const planDate = parsed.data.planDate ?? getDateInTimezone(timezone)
  const goals = getDailyGoalTargets(profile?.settings)

  const [statsResult, sessionsResult, plannerResult] = await Promise.all([
    supabase
      .from('daily_stats')
      .select('completed_sessions, total_focus_minutes')
      .eq('user_id', user.id)
      .eq('date', planDate)
      .maybeSingle(),
    supabase
      .from('focus_sessions')
      .select('status, actual_duration, interruption_count')
      .eq('user_id', user.id)
      .eq('session_type', 'focus')
      .in('status', ['completed', 'abandoned'])
      .order('started_at', { ascending: false })
      .limit(40),
    supabase
      .from('study_planner_items')
      .select('id, title, priority, estimated_minutes')
      .eq('user_id', user.id)
      .is('room_id', null)
      .in('status', ['todo', 'in_progress'])
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true }),
  ])

  if (statsResult.error || sessionsResult.error || plannerResult.error) {
    const error = statsResult.error ?? sessionsResult.error ?? plannerResult.error
    return NextResponse.json({ success: false, error: error?.message ?? 'Unable to generate plan' }, { status: 400 })
  }

  const sessions = sessionsResult.data ?? []
  const completedRows = sessions.filter((row) => row.status === 'completed').length
  const abandonedRows = sessions.filter((row) => row.status === 'abandoned').length
  const averageCompletedMinutes =
    completedRows > 0
      ? sessions
          .filter((row) => row.status === 'completed')
          .reduce((sum, row) => sum + (row.actual_duration ?? 0), 0) / completedRows
      : 25
  const averageInterruptions =
    sessions.length > 0
      ? sessions.reduce((sum, row) => sum + (row.interruption_count ?? 0), 0) / sessions.length
      : 0

  const recommendation = computeSessionRecommendation({
    totalRows: sessions.length,
    completedRows,
    abandonedRows,
    averageCompletedMinutes,
    averageInterruptions,
  })

  const fallbackPlan = buildRuleBasedDailyPlan({
    planDate,
    availableMinutes: parsed.data.availableMinutes,
    tasks: plannerResult.data ?? [],
    recommendation,
    targetSessions: goals.targetSessions,
    completedSessionsToday: statsResult.data?.completed_sessions ?? 0,
  })

  const prompt = `You are a study coach assistant. Return only JSON matching this schema:
{
  "planDate": "YYYY-MM-DD",
  "summary": "string",
  "totalPlannedMinutes": number,
  "sessions": [
    {
      "order": number,
      "title": "string",
      "taskId": "uuid or null",
      "focusMinutes": number,
      "breakMinutes": number,
      "intensity": "light|moderate|deep"
    }
  ],
  "actionItems": ["string"]
}

Context:
- date: ${planDate}
- availableMinutes: ${parsed.data.availableMinutes}
- todayCompletedSessions: ${statsResult.data?.completed_sessions ?? 0}
- dailyFocusTargetHours: ${goals.targetFocusHours}
- dailySessionsTarget: ${goals.targetSessions}
- recommendation: ${JSON.stringify(recommendation)}
- pendingTasks: ${JSON.stringify((plannerResult.data ?? []).slice(0, 12))}

Rules:
- keep focusMinutes between 15 and 50
- keep breakMinutes between 4 and 15
- total planned time must not exceed availableMinutes
- prioritize high priority tasks first
- return 3-8 sessions only
`

  const generated = await generateGeminiJson({
    prompt,
    fallback: fallbackPlan,
    schema: DailyPlanSchema,
  })

  const finalPlan = generated.data

  let persistenceWarning: string | null = null

  if (parsed.data.save) {
    const inputContext = {
      availableMinutes: parsed.data.availableMinutes,
      recommendation,
      goals,
      today: statsResult.data,
      plannerCount: (plannerResult.data ?? []).length,
    }

    const { error: saveError } = await supabase.from('ai_daily_plans').upsert(
      {
        user_id: user.id,
        plan_date: planDate,
        available_minutes: parsed.data.availableMinutes,
        input_context: inputContext,
        plan_json: finalPlan,
        source: generated.source,
      },
      { onConflict: 'user_id,plan_date' },
    )

    if (saveError) {
      persistenceWarning = saveError.message
    }
  }

  return NextResponse.json(
    {
      success: true,
      plan: finalPlan,
      source: generated.source,
      meta: {
        recommendation,
        completedSessionsToday: statsResult.data?.completed_sessions ?? 0,
      },
      warning: persistenceWarning,
    },
    { headers: response.headers },
  )
}
