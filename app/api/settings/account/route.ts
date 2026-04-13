import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-client'

const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8).optional(),
  confirmPassword: z.string().min(8).optional(),
})

export async function PATCH(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)
  const verifier = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // No-op: password verification should not replace the active session.
        },
      },
    },
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  const { name, email, currentPassword, newPassword, confirmPassword } = parsed.data

  if (!name && !email && !newPassword && !confirmPassword && !currentPassword) {
    return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 })
  }

  if (newPassword || confirmPassword || currentPassword) {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Provide current, new, and confirm password' },
        { status: 400 },
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'New password and confirmation do not match' },
        { status: 400 },
      )
    }

    const { error: verifyError } = await verifier.auth.signInWithPassword({
      email: user.email ?? '',
      password: currentPassword,
    })

    if (verifyError) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 400 },
      )
    }
  }

  if (name || email) {
    const profileUpdate: Record<string, unknown> = {}
    if (name) profileUpdate.full_name = name
    if (email) profileUpdate.email = email

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id)

    if (profileError) {
      return NextResponse.json({ success: false, error: profileError.message }, { status: 400 })
    }
  }

  if (email || name || newPassword) {
    const authUpdate: Record<string, unknown> = {}
    if (email) authUpdate.email = email
    if (name) authUpdate.data = { full_name: name }
    if (newPassword) authUpdate.password = newPassword

    const { error: authUpdateError } = await supabase.auth.updateUser(authUpdate)
    if (authUpdateError) {
      return NextResponse.json({ success: false, error: authUpdateError.message }, { status: 400 })
    }
  }

  return NextResponse.json({ success: true }, { headers: response.headers })
}
