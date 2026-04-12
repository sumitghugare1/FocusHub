import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function monthLabel(date: Date) {
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

  const thirtyDaysAgo = daysAgoIso(30)
  const sevenDaysAgo = daysAgoIso(7)

  const [
    { count: totalUsers, error: totalUsersError },
    { count: activeUsers, error: activeUsersError },
    { count: activeRooms, error: activeRoomsError },
    { data: allProfiles, error: profilesError },
    { data: focusSessions, error: sessionsError },
    { data: recentUsersRaw, error: recentUsersError },
    { data: roomsWeek, error: roomsWeekError },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('last_active_at', sevenDaysAgo),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('profiles').select('id, created_at, total_focus_time, total_sessions, role'),
    supabase
      .from('focus_sessions')
      .select('ended_at')
      .eq('status', 'completed')
      .eq('session_type', 'focus')
      .gte('ended_at', sevenDaysAgo),
    supabase
      .from('profiles')
      .select('id, full_name, username, email, avatar_url, created_at, last_active_at')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase.from('rooms').select('created_at').gte('created_at', sevenDaysAgo),
  ])

  const anyError =
    totalUsersError ||
    activeUsersError ||
    activeRoomsError ||
    profilesError ||
    sessionsError ||
    recentUsersError ||
    roomsWeekError

  if (anyError) {
    return NextResponse.json({ success: false, error: anyError.message }, { status: 400 })
  }

  const totalFocusMinutes = (allProfiles ?? []).reduce((acc, p) => acc + (p.total_focus_time ?? 0), 0)
  const totalStudyHours = Math.round(totalFocusMinutes / 60)

  const userGrowthData = Array.from({ length: 7 }, (_, index) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (6 - index))
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1)

    const usersInMonth = (allProfiles ?? []).filter((p) => {
      const created = new Date(p.created_at)
      return created >= monthStart && created < monthEnd
    }).length

    return { date: monthLabel(d), users: usersInMonth }
  })

  const activityData = Array.from({ length: 7 }, (_, index) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - index))
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    const key = d.toLocaleDateString('en-US', { weekday: 'short' })

    const daySessions = (focusSessions ?? []).filter((row) => {
      if (!row.ended_at) return false
      const endedAt = new Date(row.ended_at)
      return endedAt >= dayStart && endedAt < dayEnd
    }).length

    const dayRooms = (roomsWeek ?? []).filter((row) => {
      const createdAt = new Date(row.created_at)
      return createdAt >= dayStart && createdAt < dayEnd
    }).length

    return {
      day: key,
      sessions: daySessions,
      rooms: dayRooms,
    }
  })

  const tierBuckets = { free: 0, pro: 0, premium: 0 }
  for (const p of allProfiles ?? []) {
    const sessions = p.total_sessions ?? 0
    if (sessions >= 200) {
      tierBuckets.premium += 1
    } else if (sessions >= 50) {
      tierBuckets.pro += 1
    } else {
      tierBuckets.free += 1
    }
  }

  const userTypeData = [
    { name: 'Free', value: tierBuckets.free, color: 'hsl(var(--chart-1))' },
    { name: 'Pro', value: tierBuckets.pro, color: 'hsl(var(--chart-2))' },
    { name: 'Premium', value: tierBuckets.premium, color: 'hsl(var(--chart-3))' },
  ]

  const recentUsers = (recentUsersRaw ?? []).map((u) => {
    const name = u.full_name || u.username || 'User'
    const isActive = new Date(u.last_active_at) >= new Date(daysAgoIso(2))
    return {
      id: u.id,
      name,
      email: u.email ?? '',
      avatar: u.avatar_url ?? '',
      joinedAt: u.created_at,
      status: isActive ? 'active' : 'inactive',
    }
  })

  const systemAlerts = [
    {
      id: 1,
      type: 'info',
      message: `Active users in last 7 days: ${activeUsers ?? 0}`,
      time: 'now',
    },
    {
      id: 2,
      type: (activeRooms ?? 0) > 100 ? 'warning' : 'info',
      message: `Current active rooms: ${activeRooms ?? 0}`,
      time: 'now',
    },
    {
      id: 3,
      type: 'info',
      message: `Completed focus sessions (7d): ${(focusSessions ?? []).length}`,
      time: 'now',
    },
  ]

  return NextResponse.json(
    {
      success: true,
      stats: {
        totalUsers: totalUsers ?? 0,
        activeRooms: activeRooms ?? 0,
        totalStudyHours,
        activeUsers7d: activeUsers ?? 0,
      },
      userGrowthData,
      activityData,
      userTypeData,
      recentUsers,
      systemAlerts,
    },
    { headers: response.headers },
  )
}
