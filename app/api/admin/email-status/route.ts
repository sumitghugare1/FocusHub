import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'
import { getEmailConfigurationStatus } from '@/lib/notifications/email'

async function ensureAdmin(request: NextRequest, response: NextResponse) {
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!profile || profile.role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true as const, supabase }
}

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  const adminGate = await ensureAdmin(request, response)

  if (!adminGate.ok) {
    return adminGate.response
  }

  const status = getEmailConfigurationStatus()

  return NextResponse.json(
    {
      success: true,
      email: {
        configured: status.configured,
        issues: status.issues,
      },
    },
    { headers: response.headers },
  )
}
