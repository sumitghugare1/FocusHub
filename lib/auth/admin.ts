import { createRouteClient } from '@/lib/supabase/route-client'

export async function ensureAdmin(
  supabase: ReturnType<typeof createRouteClient>,
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    return { ok: false, message: error.message, status: 400 }
  }

  if (!profile || profile.role !== 'admin') {
    return { ok: false, message: 'Forbidden', status: 403 }
  }

  return { ok: true }
}
