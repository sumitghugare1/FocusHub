import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

type PeriodType = 'weekly' | 'monthly' | 'all_time'

type Aggregate = {
  user_id: string
  period_type: PeriodType
  period_start: string
  total_focus_minutes: number
  total_sessions: number
}

function getWeekStartUtc(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const weekday = d.getUTCDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

function getMonthStartUtc(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10)
}

function keyOf(userId: string, periodType: PeriodType, periodStart: string) {
  return `${userId}|${periodType}|${periodStart}`
}

function addAggregate(
  map: Map<string, Aggregate>,
  userId: string,
  periodType: PeriodType,
  periodStart: string,
  duration: number,
) {
  const key = keyOf(userId, periodType, periodStart)
  const existing = map.get(key)

  if (existing) {
    existing.total_focus_minutes += duration
    existing.total_sessions += 1
    return
  }

  map.set(key, {
    user_id: userId,
    period_type: periodType,
    period_start: periodStart,
    total_focus_minutes: duration,
    total_sessions: 1,
  })
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ success: false, error: profileError.message }, { status: 400 })
  }

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const reset = request.nextUrl.searchParams.get('reset') === 'true'

  if (reset) {
    const { error: resetError } = await supabase
      .from('leaderboard_entries')
      .delete()
      .not('id', 'is', null)

    if (resetError) {
      return NextResponse.json({ success: false, error: resetError.message }, { status: 400 })
    }
  }

  const pageSize = 1000

  const allProfiles: Array<{ id: string; xp: number; current_streak: number }> = []
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('profiles')
      .select('id, xp, current_streak')
      .order('id', { ascending: true })
      .range(from, to)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    const batch = data ?? []
    allProfiles.push(...batch)
    if (batch.length < pageSize) break
  }

  const allSessions: Array<{ user_id: string; actual_duration: number; ended_at: string | null }> = []
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('user_id, actual_duration, ended_at')
      .eq('status', 'completed')
      .eq('session_type', 'focus')
      .order('ended_at', { ascending: true })
      .range(from, to)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    const batch = data ?? []
    allSessions.push(...batch)
    if (batch.length < pageSize) break
  }

  const aggregates = new Map<string, Aggregate>()

  for (const session of allSessions) {
    const userId = session.user_id
    const duration = session.actual_duration ?? 0
    const endedAt = session.ended_at ? new Date(session.ended_at) : null

    if (!endedAt || Number.isNaN(endedAt.getTime())) continue

    addAggregate(aggregates, userId, 'all_time', '1970-01-01', duration)
    addAggregate(aggregates, userId, 'weekly', getWeekStartUtc(endedAt), duration)
    addAggregate(aggregates, userId, 'monthly', getMonthStartUtc(endedAt), duration)
  }

  const profileById = new Map(allProfiles.map((item) => [item.id, item]))
  const upsertRows = Array.from(aggregates.values()).map((entry) => {
    const profileRow = profileById.get(entry.user_id)

    return {
      ...entry,
      longest_streak: profileRow?.current_streak ?? 0,
      xp_earned: profileRow?.xp ?? 0,
      rank: null,
    }
  })

  for (let from = 0; from < upsertRows.length; from += pageSize) {
    const chunk = upsertRows.slice(from, from + pageSize)
    const { error } = await supabase
      .from('leaderboard_entries')
      .upsert(chunk, { onConflict: 'user_id,period_type,period_start' })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }
  }

  return NextResponse.json(
    {
      success: true,
      reset,
      processedProfiles: allProfiles.length,
      processedSessions: allSessions.length,
      upsertedEntries: upsertRows.length,
    },
    { headers: response.headers },
  )
}
