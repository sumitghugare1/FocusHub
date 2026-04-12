import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'
import { forgotPasswordSchema } from '@/lib/auth/schemas'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = forgotPasswordSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid email address' },
      { status: 400 },
    )
  }

  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${request.nextUrl.origin}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return response
}
