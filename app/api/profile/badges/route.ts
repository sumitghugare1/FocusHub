import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

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

  const [{ data: allBadges, error: allBadgesError }, { data: earnedRows, error: earnedError }] =
    await Promise.all([
      supabase.from('achievements').select('id, name, description, icon').eq('is_active', true),
      supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id),
    ])

  const error = allBadgesError || earnedError
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  const earnedIds = new Set((earnedRows ?? []).map((item) => item.achievement_id))

  const availableBadges = (allBadges ?? [])
    .filter((badge) => !earnedIds.has(badge.id))
    .map((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      earnedAt: '',
    }))

  return NextResponse.json({ success: true, availableBadges }, { headers: response.headers })
}
