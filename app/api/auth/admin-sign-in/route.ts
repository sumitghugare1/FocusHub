import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'
import { signInSchema } from '@/lib/auth/schemas'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = signInSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid login details' },
      { status: 400 },
    )
  }

  const adminEmail = process.env.ADMIN_LOGIN_EMAIL
  const adminPassword = process.env.ADMIN_LOGIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    return NextResponse.json(
      { success: false, error: 'Admin credentials are not configured in environment variables' },
      { status: 500 },
    )
  }

  if (parsed.data.email !== adminEmail || parsed.data.password !== adminPassword) {
    return NextResponse.json({ success: false, error: 'Invalid admin credentials' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (signInError || !signInData.user) {
    return NextResponse.json(
      { success: false, error: signInError?.message ?? 'Unable to sign in admin' },
      { status: 400 },
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', signInData.user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    await supabase.auth.signOut()
    return NextResponse.json(
      { success: false, error: 'This account is not an admin account' },
      { status: 403 },
    )
  }

  return response
}
