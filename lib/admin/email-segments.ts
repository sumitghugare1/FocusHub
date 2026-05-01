import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export type UserSegmentCriteria = {
  tiers?: ('free' | 'pro' | 'premium')[]
  activityStatus?: ('active' | 'inactive')[]
  streakMinimum?: number
  respectPreferences?: boolean
}

export type SegmentedUser = {
  id: string
  email: string | null
  full_name: string | null
  level: number
  current_streak: number
}

function getDaysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export async function buildUserSegmentQuery(
  supabase: SupabaseClient<Database>,
  criteria: UserSegmentCriteria
): Promise<SegmentedUser[]> {
  let query = supabase
    .from('profiles')
    .select('id, email, full_name, level, current_streak, total_sessions, last_active_at, settings')
    .eq('role', 'user')

  // Filter by subscription tier (based on total_sessions)
  if (criteria.tiers && criteria.tiers.length > 0) {
    const tiers = criteria.tiers

    // Build a filter for tiers: we need to check sessions count
    // free: < 50, pro: 50-199, premium: >= 200
    // We'll get all and filter in-app since Supabase query is complex for this

    const { data: allProfiles, error: allError } = await query

    if (allError) {
      throw new Error(`Failed to fetch profiles: ${allError.message}`)
    }

    const filtered = (allProfiles ?? []).filter((profile) => {
      const sessions = profile.total_sessions ?? 0
      const tier = sessions >= 200 ? 'premium' : sessions >= 50 ? 'pro' : 'free'
      return tiers.includes(tier as 'free' | 'pro' | 'premium')
    })

    // Now apply activity filter to the already-filtered list
    const activeThreshold = getDaysAgoIso(2)

    let final = filtered
    if (criteria.activityStatus && criteria.activityStatus.length > 0) {
      final = filtered.filter((profile) => {
        const isActive = new Date(profile.last_active_at) >= new Date(activeThreshold)
        return criteria.activityStatus!.includes(isActive ? 'active' : 'inactive')
      })
    }

    if (criteria.streakMinimum !== undefined && criteria.streakMinimum > 0) {
      final = final.filter((profile) => (profile.current_streak ?? 0) >= criteria.streakMinimum!)
    }

    if (criteria.respectPreferences) {
      final = final.filter((profile) => {
        const settings = profile.settings as Record<string, unknown> | null | undefined
        const notifications = (settings?.notifications as Record<string, unknown>) ?? {}
        const email = (notifications.email as Record<string, unknown>) ?? {}
        // Only include users who have NOT opted out of emails
        return email.sessionComplete !== false && (email.marketingEmails !== false || email.productUpdates !== false)
      })
    }

    return final.map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      level: p.level,
      current_streak: p.current_streak ?? 0,
    }))
  }

  // If no tier filter, just apply other criteria
  const { data: allProfiles, error: allError } = await query

  if (allError) {
    throw new Error(`Failed to fetch profiles: ${allError.message}`)
  }

  const activeThreshold = getDaysAgoIso(2)

  let final = allProfiles ?? []

  if (criteria.activityStatus && criteria.activityStatus.length > 0) {
    final = final.filter((profile) => {
      const isActive = new Date(profile.last_active_at) >= new Date(activeThreshold)
      return criteria.activityStatus!.includes(isActive ? 'active' : 'inactive')
    })
  }

  if (criteria.streakMinimum !== undefined && criteria.streakMinimum > 0) {
    final = final.filter((profile) => (profile.current_streak ?? 0) >= criteria.streakMinimum!)
  }

  if (criteria.respectPreferences) {
    final = final.filter((profile) => {
      const settings = profile.settings as Record<string, unknown> | null | undefined
      const notifications = (settings?.notifications as Record<string, unknown>) ?? {}
      const email = (notifications.email as Record<string, unknown>) ?? {}
      return email.sessionComplete !== false && (email.marketingEmails !== false || email.productUpdates !== false)
    })
  }

  return final.map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    level: p.level,
    current_streak: p.current_streak ?? 0,
  }))
}
