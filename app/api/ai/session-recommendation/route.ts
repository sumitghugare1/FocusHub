import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'
import { computeSessionRecommendation } from '@/lib/ai/coach'

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

  const { data: sessions, error } = await supabase
    .from('focus_sessions')
    .select('status, actual_duration, interruption_count')
    .eq('user_id', user.id)
    .eq('session_type', 'focus')
    .in('status', ['completed', 'abandoned'])
    .order('started_at', { ascending: false })
    .limit(40)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  const totalRows = sessions?.length ?? 0
  const completedRows = (sessions ?? []).filter((row) => row.status === 'completed').length
  const abandonedRows = (sessions ?? []).filter((row) => row.status === 'abandoned').length

  const completedDurations = (sessions ?? [])
    .filter((row) => row.status === 'completed')
    .map((row) => row.actual_duration ?? 0)

  const averageCompletedMinutes =
    completedDurations.length > 0
      ? completedDurations.reduce((sum, minutes) => sum + minutes, 0) / completedDurations.length
      : 25

  const averageInterruptions =
    totalRows > 0
      ? (sessions ?? []).reduce((sum, row) => sum + (row.interruption_count ?? 0), 0) / totalRows
      : 0

  const recommendation = computeSessionRecommendation({
    totalRows,
    completedRows,
    abandonedRows,
    averageCompletedMinutes,
    averageInterruptions,
  })

  return NextResponse.json(
    {
      success: true,
      recommendation,
      analytics: {
        totalRows,
        completedRows,
        abandonedRows,
      },
    },
    { headers: response.headers },
  )
}
