import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

function parseRangeToDays(range: string | null): number {
  if (!range) return 30
  if (range === '7d') return 7
  if (range === '30d') return 30
  if (range === '90d') return 90
  return 180
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

  const range = request.nextUrl.searchParams.get('range')
  const days = parseRangeToDays(range)

  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  const startIso = start.toISOString().slice(0, 10)

  const { data: rows, error } = await supabase
    .from('daily_stats')
    .select('date, total_focus_minutes, completed_sessions, focus_sessions')
    .eq('user_id', user.id)
    .gte('date', startIso)
    .order('date', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  const daily = (rows ?? []).map((row) => ({
    date: row.date,
    totalMinutes: row.total_focus_minutes,
    sessionsCompleted: row.completed_sessions,
    focusScore:
      row.focus_sessions > 0
        ? Math.min(100, Math.round((row.completed_sessions / row.focus_sessions) * 100))
        : 0,
  }))

  const hourlyBuckets = new Map<number, number>()
  for (let i = 0; i < 24; i += 1) hourlyBuckets.set(i, 0)

  const { data: sessions } = await supabase
    .from('focus_sessions')
    .select('started_at')
    .eq('user_id', user.id)
    .eq('session_type', 'focus')
    .eq('status', 'completed')
    .gte('started_at', `${startIso}T00:00:00.000Z`)

  ;(sessions ?? []).forEach((session) => {
    const hour = new Date(session.started_at).getHours()
    hourlyBuckets.set(hour, (hourlyBuckets.get(hour) ?? 0) + 1)
  })

  const sessionDistribution = [
    { name: 'Morning (6-12)', value: 0 },
    { name: 'Afternoon (12-18)', value: 0 },
    { name: 'Evening (18-24)', value: 0 },
    { name: 'Night (0-6)', value: 0 },
  ]

  hourlyBuckets.forEach((count, hour) => {
    if (hour >= 6 && hour < 12) sessionDistribution[0].value += count
    else if (hour >= 12 && hour < 18) sessionDistribution[1].value += count
    else if (hour >= 18 && hour < 24) sessionDistribution[2].value += count
    else sessionDistribution[3].value += count
  })

  const weeklyPatternMap = new Map<string, number>([
    ['Mon', 0],
    ['Tue', 0],
    ['Wed', 0],
    ['Thu', 0],
    ['Fri', 0],
    ['Sat', 0],
    ['Sun', 0],
  ])

  daily.forEach((item) => {
    const weekday = new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })
    weeklyPatternMap.set(weekday, (weeklyPatternMap.get(weekday) ?? 0) + item.totalMinutes)
  })

  const weeklyPattern = Array.from(weeklyPatternMap.entries()).map(([day, minutes]) => ({
    day,
    minutes,
  }))

  return NextResponse.json(
    {
      success: true,
      daily,
      weeklyPattern,
      sessionDistribution,
    },
    { headers: response.headers },
  )
}
