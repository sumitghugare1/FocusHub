import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'

const updateSchema = z.object({
  appearance: z
    .object({
      theme: z.enum(['light', 'dark', 'system']),
      compactMode: z.boolean(),
    })
    .optional(),
  notifications: z
    .object({
      sessionComplete: z.boolean(),
      breakReminder: z.boolean(),
      streakReminder: z.boolean(),
      weeklyReport: z.boolean(),
      roomInvites: z.boolean(),
      achievements: z.boolean(),
      marketingEmails: z.boolean(),
      productUpdates: z.boolean(),
    })
    .optional(),
})

function normalizeAppearance(value: unknown) {
  const raw = (value ?? {}) as Record<string, unknown>
  const theme = raw.theme
  return {
    theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'dark',
    compactMode: typeof raw.compactMode === 'boolean' ? raw.compactMode : false,
  }
}

function normalizeNotifications(value: unknown) {
  const raw = (value ?? {}) as Record<string, unknown>

  const email = (raw.email ?? {}) as Record<string, unknown>
  const inApp = (raw.inApp ?? {}) as Record<string, unknown>

  return {
    sessionComplete:
      typeof inApp.sessionComplete === 'boolean' ? inApp.sessionComplete : true,
    breakReminder: typeof inApp.breakReminder === 'boolean' ? inApp.breakReminder : true,
    streakReminder: typeof inApp.streakReminder === 'boolean' ? inApp.streakReminder : true,
    weeklyReport: typeof inApp.weeklyReport === 'boolean' ? inApp.weeklyReport : true,
    roomInvites: typeof inApp.roomInvites === 'boolean' ? inApp.roomInvites : true,
    achievements: typeof inApp.achievements === 'boolean' ? inApp.achievements : true,
    marketingEmails: typeof email.marketing === 'boolean' ? email.marketing : false,
    productUpdates: typeof email.productUpdates === 'boolean' ? email.productUpdates : true,
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
    .select('id, full_name, email, settings')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  const settings = (profile?.settings ?? {}) as Record<string, unknown>

  return NextResponse.json(
    {
      success: true,
      account: {
        name: profile?.full_name ?? user.user_metadata?.full_name ?? '',
        email: user.email ?? profile?.email ?? '',
      },
      appearance: normalizeAppearance(settings.appearance),
      notifications: normalizeNotifications(settings.notifications),
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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ success: false, error: profileError.message }, { status: 400 })
  }

  const currentSettings = (profile?.settings ?? {}) as Record<string, unknown>
  const currentNotifications = (currentSettings.notifications ?? {}) as Record<string, unknown>
  const currentEmailNotifications = (currentNotifications.email ?? {}) as Record<string, unknown>
  const currentInAppNotifications = (currentNotifications.inApp ?? {}) as Record<string, unknown>

  const nextAppearance = parsed.data.appearance
    ? {
        ...(currentSettings.appearance as Record<string, unknown> | undefined),
        theme: parsed.data.appearance.theme,
        compactMode: parsed.data.appearance.compactMode,
      }
    : currentSettings.appearance

  const nextNotifications = parsed.data.notifications
    ? {
        ...currentNotifications,
        email: {
          ...currentEmailNotifications,
          marketing: parsed.data.notifications.marketingEmails,
          productUpdates: parsed.data.notifications.productUpdates,
          weeklyReport: parsed.data.notifications.weeklyReport,
        },
        inApp: {
          ...currentInAppNotifications,
          sessionComplete: parsed.data.notifications.sessionComplete,
          breakReminder: parsed.data.notifications.breakReminder,
          streakReminder: parsed.data.notifications.streakReminder,
          weeklyReport: parsed.data.notifications.weeklyReport,
          roomInvites: parsed.data.notifications.roomInvites,
          achievements: parsed.data.notifications.achievements,
        },
      }
    : currentSettings.notifications

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      settings: {
        ...currentSettings,
        ...(nextAppearance ? { appearance: nextAppearance } : {}),
        ...(nextNotifications ? { notifications: nextNotifications } : {}),
      },
    })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}
