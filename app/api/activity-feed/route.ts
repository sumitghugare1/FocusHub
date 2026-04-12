import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

function getStartIso(range: string | null): string {
  const now = new Date()
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365
  now.setDate(now.getDate() - days)
  return now.toISOString()
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

  const type = request.nextUrl.searchParams.get('type')
  const range = request.nextUrl.searchParams.get('range')
  const startIso = getStartIso(range)

  let query = supabase
    .from('activity_feed')
    .select('id, type, description, created_at, is_public')
    .eq('user_id', user.id)
    .gte('created_at', startIso)
    .order('created_at', { ascending: false })
    .limit(200)

  if (type && type !== 'all') {
    query = query.eq('type', type)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json(
    {
      success: true,
      items: (data ?? []).map((item) => ({
        id: item.id,
        type: item.type,
        message: item.description,
        timestamp: item.created_at,
        isPublic: item.is_public,
      })),
    },
    { headers: response.headers },
  )
}
