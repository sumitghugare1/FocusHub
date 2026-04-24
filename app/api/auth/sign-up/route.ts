import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createRouteClient } from '@/lib/supabase/route-client'
import { signUpSchema } from '@/lib/auth/schemas'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = signUpSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid registration details' },
      { status: 400 },
    )
  }

  const reservedAdminEmail = process.env.ADMIN_LOGIN_EMAIL?.trim().toLowerCase()
  if (reservedAdminEmail && parsed.data.email.trim().toLowerCase() === reservedAdminEmail) {
    return NextResponse.json(
      { success: false, error: 'This email is reserved for admin access' },
      { status: 403 },
    )
  }

  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)
  const fullName = `${parsed.data.firstName.trim()} ${parsed.data.lastName.trim()}`.trim()

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: fullName,
        first_name: parsed.data.firstName.trim(),
        last_name: parsed.data.lastName.trim(),
      },
      emailRedirectTo: `${request.nextUrl.origin}/auth/callback?next=/dashboard`,
    },
  })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // If email confirmations are enabled in Supabase, auto-confirm and sign in immediately.
  if (!data.session && data.user && serviceRoleKey) {
    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {
            // No cookies are needed for admin operations.
          },
        },
      },
    )

    const { error: confirmError } = await adminClient.auth.admin.updateUserById(data.user.id, {
      email_confirm: true,
    })

    if (!confirmError) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      })

      if (!signInError) {
        return new Response(JSON.stringify({ success: true, requiresEmailVerification: false }), {
          status: 200,
          headers: response.headers,
        })
      }
    }
  }

  const payload = {
    success: true,
    requiresEmailVerification: !data.session,
  }

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: response.headers,
  })
}
