import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

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
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() verifies the session server-side — safe for authorization.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Protect /dashboard/* — requires any authenticated user ──────────────
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    // Epic G: a suspended account must not keep using the app just because
    // its session token is still valid — sign it out and explain why.
    const { data: profile } = await supabase.from('users').select('suspended_at').eq('id', user.id).maybeSingle()
    if (profile?.suspended_at) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/sign-in?suspended=1', request.url))
    }
  }

  // Admin routes moved to their own app (apps/admin, separate deployment) —
  // no /admin path exists in this app anymore, nothing to protect here.

  // ── Redirect authenticated users away from auth pages ───────────────────
  const authPaths = ['/sign-in', '/sign-up', '/forgot-password']
  if (user && authPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files, images, and API routes.
     * The session refresh must run on every navigation so tokens stay fresh.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
