import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-client'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  const supabase = createRouteClient(request, response)

  const { error } = await supabase.auth.signOut()

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
      response.cookies.set(cookie.name, '', {
        path: '/',
        expires: new Date(0),
      })
    }
  }

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400, headers: response.headers })
  }

  return response
}
