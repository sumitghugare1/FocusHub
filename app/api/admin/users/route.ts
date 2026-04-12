import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
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

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, username, email, avatar_url, role, total_focus_time, total_sessions, created_at, last_active_at')
    .order('created_at', { ascending: false })

  if (profilesError) {
    return NextResponse.json({ success: false, error: profilesError.message }, { status: 400 })
  }

  const inactiveCutoff = daysAgoIso(2)
  const users = (profiles ?? []).map((p) => {
    const status = new Date(p.last_active_at) >= new Date(inactiveCutoff) ? 'active' : 'inactive'
    const sessions = p.total_sessions ?? 0
    const tier = sessions >= 200 ? 'premium' : sessions >= 50 ? 'pro' : 'free'

    return {
      id: p.id,
      name: p.full_name || p.username || 'User',
      email: p.email ?? '',
      avatar: p.avatar_url ?? '',
      role: p.role,
      tier,
      status,
      studyHours: Math.round((p.total_focus_time ?? 0) / 60),
      sessionsCompleted: sessions,
      joinedAt: p.created_at,
      lastActive: p.last_active_at,
    }
  })

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    inactive: users.filter((u) => u.status === 'inactive').length,
    banned: 0,
  }

  return NextResponse.json({ success: true, stats, users }, { headers: response.headers })
}
