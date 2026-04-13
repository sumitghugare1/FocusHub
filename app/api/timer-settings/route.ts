import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'
import { defaultTimerSettings } from '@/lib/constants/timer-settings'

type TimerPayload = {
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  sessionsBeforeLongBreak: number
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  soundEnabled: boolean
}

const updateSchema = z.object({
  focusDuration: z.number().int().min(15).max(60),
  shortBreakDuration: z.number().int().min(3).max(15),
  longBreakDuration: z.number().int().min(10).max(30),
  sessionsBeforeLongBreak: z.number().int().min(2).max(6),
  autoStartBreaks: z.boolean(),
  autoStartPomodoros: z.boolean(),
  soundEnabled: z.boolean(),
})

function normalizeTimerSettings(rawTimer: unknown): TimerPayload {
  const timer = (rawTimer ?? {}) as Record<string, unknown>

  return {
    focusDuration:
      typeof timer.focusDuration === 'number'
        ? timer.focusDuration
        : defaultTimerSettings.focusDuration,
    shortBreakDuration:
      typeof timer.shortBreakDuration === 'number'
        ? timer.shortBreakDuration
        : defaultTimerSettings.shortBreakDuration,
    longBreakDuration:
      typeof timer.longBreakDuration === 'number'
        ? timer.longBreakDuration
        : defaultTimerSettings.longBreakDuration,
    sessionsBeforeLongBreak:
      typeof timer.sessionsBeforeLongBreak === 'number'
        ? timer.sessionsBeforeLongBreak
        : typeof timer.sessionsUntilLongBreak === 'number'
          ? timer.sessionsUntilLongBreak
          : defaultTimerSettings.sessionsBeforeLongBreak,
    autoStartBreaks:
      typeof timer.autoStartBreaks === 'boolean'
        ? timer.autoStartBreaks
        : defaultTimerSettings.autoStartBreaks,
    autoStartPomodoros:
      typeof timer.autoStartPomodoros === 'boolean'
        ? timer.autoStartPomodoros
        : typeof timer.autoStartFocus === 'boolean'
          ? timer.autoStartFocus
          : defaultTimerSettings.autoStartPomodoros,
    soundEnabled:
      typeof timer.soundEnabled === 'boolean'
        ? timer.soundEnabled
        : defaultTimerSettings.soundEnabled,
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
  const timer = normalizeTimerSettings(settings.timer)

  return NextResponse.json({ success: true, timer }, { headers: response.headers })
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
  const existingTimer = (currentSettings.timer ?? {}) as Record<string, unknown>

  const nextTimer = {
    ...existingTimer,
    focusDuration: parsed.data.focusDuration,
    shortBreakDuration: parsed.data.shortBreakDuration,
    longBreakDuration: parsed.data.longBreakDuration,
    sessionsUntilLongBreak: parsed.data.sessionsBeforeLongBreak,
    sessionsBeforeLongBreak: parsed.data.sessionsBeforeLongBreak,
    autoStartBreaks: parsed.data.autoStartBreaks,
    autoStartFocus: parsed.data.autoStartPomodoros,
    autoStartPomodoros: parsed.data.autoStartPomodoros,
    soundEnabled: parsed.data.soundEnabled,
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      settings: {
        ...currentSettings,
        timer: nextTimer,
      },
    })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}
