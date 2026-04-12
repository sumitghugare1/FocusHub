import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'

const updateSchema = z.object({
  targetFocusHours: z.number().int().min(1).max(24),
  targetSessions: z.number().int().min(1).max(50),
})

function getDefaultGoal() {
  return {
    targetFocusHours: 4,
    targetSessions: 8,
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

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  const settings = (profile?.settings ?? {}) as Record<string, unknown>
  const goals = (settings.goals ?? {}) as Record<string, unknown>
  const daily = (goals.daily ?? {}) as Record<string, unknown>

  const goal = {
    targetFocusHours:
      typeof daily.targetFocusHours === 'number'
        ? daily.targetFocusHours
        : getDefaultGoal().targetFocusHours,
    targetSessions:
      typeof daily.targetSessions === 'number'
        ? daily.targetSessions
        : getDefaultGoal().targetSessions,
  }

  return NextResponse.json({ success: true, dailyGoal: goal }, { headers: response.headers })
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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ success: false, error: profileError.message }, { status: 400 })
  }

  const currentSettings = (profile?.settings ?? {}) as Record<string, unknown>
  const currentGoals = (currentSettings.goals ?? {}) as Record<string, unknown>

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      settings: {
        ...currentSettings,
        goals: {
          ...currentGoals,
          daily: {
            targetFocusHours: parsed.data.targetFocusHours,
            targetSessions: parsed.data.targetSessions,
          },
        },
      },
    })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}
