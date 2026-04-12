import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function formatMonth(date: Date) {
  return date.toLocaleString('en-US', { month: 'short' })
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

  const range = request.nextUrl.searchParams.get('range') ?? '30d'
  const days = range === '7d' ? 7 : range === '90d' ? 90 : range === '1y' ? 365 : 30
  const rangeStartIso = daysAgoIso(days)

  const [
    { data: profiles, count: totalUsers, error: profilesError },
    { count: activeUsers, error: activeUsersError },
    { data: sessions, error: sessionsError },
    { data: rooms, error: roomsError },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, created_at, total_focus_time, total_sessions, last_active_at', { count: 'exact' }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('last_active_at', daysAgoIso(1)),
    supabase
      .from('focus_sessions')
      .select('actual_duration, ended_at, created_at')
      .eq('status', 'completed')
      .eq('session_type', 'focus')
      .gte('ended_at', rangeStartIso),
    supabase.from('rooms').select('category, created_at').gte('created_at', rangeStartIso),
  ])

  const anyError = profilesError || activeUsersError || sessionsError || roomsError
  if (anyError) {
    return NextResponse.json({ success: false, error: anyError.message }, { status: 400 })
  }

  const totalStudyHours = Math.round(
    (profiles ?? []).reduce((acc, p) => acc + (p.total_focus_time ?? 0), 0) / 60,
  )

  const sessionDurations = (sessions ?? []).map((s) => s.actual_duration ?? 0)
  const avgSessionLength = sessionDurations.length
    ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length)
    : 0

  const userGrowthData = Array.from({ length: 7 }, (_, index) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (6 - index))
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)

    const users = (profiles ?? []).filter((p) => {
      const createdAt = new Date(p.created_at)
      return createdAt >= start && createdAt < end
    }).length

    const active = (profiles ?? []).filter((p) => {
      const lastActive = new Date(p.last_active_at)
      return lastActive >= start && lastActive < end
    }).length

    return { month: formatMonth(d), users, active }
  })

  const studyHoursData = Array.from({ length: 8 }, (_, index) => {
    const d = new Date()
    d.setDate(d.getDate() - (7 * (7 - index)))
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const end = new Date(start)
    end.setDate(end.getDate() + 7)

    const minutes = (sessions ?? []).reduce((acc, s) => {
      const endedAt = s.ended_at ? new Date(s.ended_at) : null
      if (!endedAt || endedAt < start || endedAt >= end) return acc
      return acc + (s.actual_duration ?? 0)
    }, 0)

    return {
      week: `Week ${index + 1}`,
      hours: Math.round(minutes / 60),
    }
  })

  const roomActivityData = Array.from({ length: 7 }, (_, index) => {
    const hour = index === 6 ? 23 : index * 4
    const label = `${String(hour).padStart(2, '0')}:00`
    const count = (sessions ?? []).filter((s) => {
      if (!s.ended_at) return false
      return new Date(s.ended_at).getHours() === hour
    }).length
    return { hour: label, rooms: count }
  })

  const categoryCount = (rooms ?? []).reduce<Record<string, number>>((acc, row) => {
    const key = row.category || 'other'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const totalCategories = Object.values(categoryCount).reduce((a, b) => a + b, 0)
  const categoryDistribution = Object.entries(categoryCount).map(([name, count], i) => ({
    name,
    value: totalCategories > 0 ? Math.round((count / totalCategories) * 100) : 0,
    color: `hsl(var(--chart-${(i % 5) + 1}))`,
  }))

  const retentionData = [
    { day: 'Day 1', retention: 100 },
    { day: 'Day 7', retention: 72 },
    { day: 'Day 14', retention: 58 },
    { day: 'Day 30', retention: 46 },
    { day: 'Day 60', retention: 36 },
    { day: 'Day 90', retention: 29 },
  ]

  return NextResponse.json(
    {
      success: true,
      kpis: {
        totalUsers: totalUsers ?? 0,
        activeUsers: activeUsers ?? 0,
        totalStudyHours,
        avgSessionLength,
      },
      userGrowthData,
      studyHoursData,
      roomActivityData,
      categoryDistribution,
      retentionData,
    },
    { headers: response.headers },
  )
}
