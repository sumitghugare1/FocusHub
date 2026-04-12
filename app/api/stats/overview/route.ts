import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

function getWeekStartFromDate(dateIso: string): string {
  const [year, month, dayOfMonth] = dateIso.split('-').map(Number)
  const d = new Date(Date.UTC(year, (month ?? 1) - 1, dayOfMonth ?? 1))
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

function getDateInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_focus_time, total_sessions, current_streak, longest_streak, level, xp, timezone')
    .eq('id', user.id)
    .maybeSingle()

  const timezone = profile?.timezone ?? 'UTC'
  const today = getDateInTimezone(timezone)
  const weekStart = getWeekStartFromDate(today)

  const [
    { data: todayStats },
    { data: weeklyGoal },
    { data: recentActivity },
    { data: activeRooms },
    { data: memberships },
  ] = await Promise.all([
    supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle(),
    supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .maybeSingle(),
    supabase
      .from('activity_feed')
      .select('id, type, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('rooms')
      .select('id, name, category, status, max_participants, host_id, profiles:host_id(full_name, username)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('room_members').select('room_id, user_id'),
  ])

  const memberCountByRoom = (memberships ?? []).reduce<Record<string, number>>((acc, item) => {
    acc[item.room_id] = (acc[item.room_id] ?? 0) + 1
    return acc
  }, {})

  const rooms = (activeRooms ?? []).map((room) => ({
    id: room.id,
    name: room.name,
    topic: room.category,
    status: room.status,
    maxParticipants: room.max_participants,
    participantCount: memberCountByRoom[room.id] ?? 0,
    hostName:
      (Array.isArray(room.profiles) ? room.profiles[0]?.full_name : room.profiles?.full_name) ||
      (Array.isArray(room.profiles) ? room.profiles[0]?.username : room.profiles?.username) ||
      'Host',
  }))

  return NextResponse.json(
    {
      success: true,
      profile: {
        totalFocusTime: profile?.total_focus_time ?? 0,
        totalSessions: profile?.total_sessions ?? 0,
        currentStreak: profile?.current_streak ?? 0,
        longestStreak: profile?.longest_streak ?? 0,
        level: profile?.level ?? 1,
        xp: profile?.xp ?? 0,
      },
      today: {
        focusMinutes: todayStats?.total_focus_minutes ?? 0,
        completedSessions: todayStats?.completed_sessions ?? 0,
        abandonedSessions: todayStats?.abandoned_sessions ?? 0,
        focusSessions: todayStats?.focus_sessions ?? 0,
      },
      weeklyGoal: weeklyGoal
        ? {
            targetFocusHours: weeklyGoal.target_focus_hours,
            targetSessions: weeklyGoal.target_sessions,
            targetStreakDays: weeklyGoal.target_streak_days,
            achievedFocusHours: weeklyGoal.achieved_focus_hours,
            achievedSessions: weeklyGoal.achieved_sessions,
            achievedStreakDays: weeklyGoal.achieved_streak_days,
            progressPercentage: weeklyGoal.progress_percentage,
          }
        : null,
      recentActivity:
        recentActivity?.map((item) => ({
          id: item.id,
          type: item.type,
          message: item.description,
          timestamp: item.created_at,
        })) ?? [],
      activeRooms: rooms,
    },
    { headers: response.headers },
  )
}
