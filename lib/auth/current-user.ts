import type { User as AppUser, Badge } from '@/types'
import type { Database } from '@/types/database'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

function badgeFromAchievement(
  achievement: {
    id: string
    name: string
    description: string
    icon: string
  } | null,
  earnedAt: string,
): Badge | null {
  if (!achievement) return null

  return {
    id: achievement.id,
    name: achievement.name,
    description: achievement.description,
    icon: achievement.icon,
    earnedAt,
  }
}

export function toAppUser(params: {
  authUser: { id: string; email?: string | null; created_at?: string | null }
  profile: ProfileRow | null
  badges?: Array<{
    achievement: { id: string; name: string; description: string; icon: string } | null
    earned_at: string
  }>
}): AppUser {
  const { authUser, profile, badges = [] } = params
  const nameFromEmail = authUser.email?.split('@')[0] ?? 'User'
  const resolvedName = profile?.full_name ?? profile?.username ?? nameFromEmail

  const mappedBadges = badges
    .map((item) => badgeFromAchievement(item.achievement, item.earned_at))
    .filter((item): item is Badge => Boolean(item))

  return {
    id: authUser.id,
    name: resolvedName,
    email: authUser.email ?? profile?.email ?? '',
    avatar: profile?.avatar_url ?? undefined,
    role: profile?.role === 'admin' ? 'admin' : 'user',
    createdAt: profile?.created_at ?? authUser.created_at ?? new Date().toISOString(),
    totalStudyTime: profile?.total_focus_time ?? 0,
    currentStreak: profile?.current_streak ?? 0,
    longestStreak: profile?.longest_streak ?? 0,
    sessionsCompleted: profile?.total_sessions ?? 0,
    level: profile?.level ?? 1,
    xp: profile?.xp ?? 0,
    badges: mappedBadges,
    status: 'online',
  }
}
