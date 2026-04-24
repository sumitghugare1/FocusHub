import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const isPrefetchRequest =
    request.headers.has('next-router-prefetch') || request.headers.get('purpose') === 'prefetch'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: Do not run code between createServerClient and supabase.auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/quiz', '/timer', '/rooms', '/analytics', '/leaderboard', '/profile', '/settings']
  const adminPaths = ['/admin']
  const adminLoginPath = '/admin/login'
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
  const isAdminPath = adminPaths.some(path => request.nextUrl.pathname.startsWith(path))
  const isAdminLoginPath = request.nextUrl.pathname === adminLoginPath

  // Prevent login redirects from being cached by client-side route prefetches.
  // Real navigations still go through the checks below.
  if (isPrefetchRequest) {
    return supabaseResponse
  }

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Admin routes - check for admin role
  if (isAdminPath && !isAdminLoginPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  if (isAdminPath && !isAdminLoginPath && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // If user is logged in and tries to access auth pages, redirect to dashboard
  const authPaths = ['/login', '/register', '/forgot-password', '/admin/login']
  const isAuthPath = authPaths.some(path => request.nextUrl.pathname === path)

  if (isAuthPath && user) {
    if (request.nextUrl.pathname === '/admin/login') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const url = request.nextUrl.clone()
      url.pathname = profile?.role === 'admin' ? '/admin' : '/dashboard'
      return NextResponse.redirect(url)
    }

    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
