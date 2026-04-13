import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'

const updateSchema = z.object({
  general: z.object({
    siteName: z.string().min(1),
    siteUrl: z.string().url(),
    siteDescription: z.string().min(1),
    timezone: z.string().min(1),
    language: z.string().min(1),
    maintenanceMode: z.boolean(),
    allowNewRegistrations: z.boolean(),
  }),
  notifications: z.object({
    emailNotifications: z.boolean(),
    pushNotifications: z.boolean(),
    inAppNotifications: z.boolean(),
    sessionReminders: z.boolean(),
    achievementAlerts: z.boolean(),
    weeklyReports: z.boolean(),
  }),
  security: z.object({
    twoFactorAuth: z.boolean(),
    emailVerification: z.boolean(),
    oauthLogin: z.boolean(),
    sessionTimeoutMinutes: z.number().int().min(5).max(10080),
    maxLoginAttempts: z.number().int().min(1).max(20),
    passwordMinLength: z.number().int().min(6).max(64),
    lockoutDurationMinutes: z.number().int().min(1).max(1440),
  }),
  email: z.object({
    provider: z.string().min(1),
    fromEmail: z.string().email(),
    apiKey: z.string().min(1),
    smtpHost: z.string().min(1),
    smtpPort: z.number().int().min(1).max(65535),
  }),
  appearance: z.object({
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    defaultTheme: z.enum(['light', 'dark', 'system']),
    allowThemeToggle: z.boolean(),
    showLogo: z.boolean(),
  }),
})

type AdminSettingsPayload = z.infer<typeof updateSchema>

function getDefaultAdminSettings(): AdminSettingsPayload {
  return {
    general: {
      siteName: process.env.NEXT_PUBLIC_SITE_NAME ?? 'FocusHub',
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      siteDescription: 'Virtual study rooms and Pomodoro timer for productive studying',
      timezone: 'utc',
      language: 'en',
      maintenanceMode: false,
      allowNewRegistrations: true,
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      inAppNotifications: true,
      sessionReminders: true,
      achievementAlerts: true,
      weeklyReports: false,
    },
    security: {
      twoFactorAuth: true,
      emailVerification: true,
      oauthLogin: true,
      sessionTimeoutMinutes: 60,
      maxLoginAttempts: 5,
      passwordMinLength: 8,
      lockoutDurationMinutes: 15,
    },
    email: {
      provider: 'resend',
      fromEmail: process.env.NEXT_PUBLIC_FROM_EMAIL ?? 'noreply@example.com',
      apiKey: '••••••••••••••••',
      smtpHost: 'smtp.resend.com',
      smtpPort: 587,
    },
    appearance: {
      primaryColor: '#8b5cf6',
      defaultTheme: 'dark',
      allowThemeToggle: true,
      showLogo: true,
    },
  }
}

function mergeWithDefaults(value: unknown): AdminSettingsPayload {
  const defaults = getDefaultAdminSettings()
  const raw = (value ?? {}) as Partial<AdminSettingsPayload>
  return {
    general: { ...defaults.general, ...(raw.general ?? {}) },
    notifications: { ...defaults.notifications, ...(raw.notifications ?? {}) },
    security: { ...defaults.security, ...(raw.security ?? {}) },
    email: { ...defaults.email, ...(raw.email ?? {}) },
    appearance: { ...defaults.appearance, ...(raw.appearance ?? {}) },
  }
}

async function ensureAdmin(
  supabase: ReturnType<typeof createRouteClient>,
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    return { ok: false, message: error.message, status: 400 }
  }

  if (!profile || profile.role !== 'admin') {
    return { ok: false, message: 'Forbidden', status: 403 }
  }

  return { ok: true }
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

  const adminGate = await ensureAdmin(supabase, user.id)
  if (!adminGate.ok) {
    return NextResponse.json({ success: false, error: adminGate.message }, { status: adminGate.status })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  const profileSettings = (profile?.settings ?? {}) as Record<string, unknown>
  const adminSettings = mergeWithDefaults(profileSettings.adminPlatform)

  return NextResponse.json({ success: true, settings: adminSettings }, { headers: response.headers })
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

  const adminGate = await ensureAdmin(supabase, user.id)
  if (!adminGate.ok) {
    return NextResponse.json({ success: false, error: adminGate.message }, { status: adminGate.status })
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

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      settings: {
        ...currentSettings,
        adminPlatform: parsed.data,
      },
    })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}
