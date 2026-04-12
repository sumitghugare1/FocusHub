import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'
import { toAppUser } from '@/lib/auth/current-user'

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
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const { data: userAchievements } = await supabase
    .from('user_achievements')
    .select('earned_at, achievements(id, name, description, icon)')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false })

  const appUser = toAppUser({
    authUser: user,
    profile,
    badges:
      userAchievements?.map((item) => ({
        earned_at: item.earned_at,
        achievement: Array.isArray(item.achievements)
          ? item.achievements[0] ?? null
          : item.achievements,
      })) ?? [],
  })

  return NextResponse.json({ success: true, user: appUser }, { headers: response.headers })
}
