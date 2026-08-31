import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRow } from '@pshq/database'
import { webUrl } from '@/lib/web-url'

// This whole app is the admin panel — every route needs an admin/super_admin
// session. There's no local sign-in page (that lives on apps/web), so an
// unauthenticated or non-admin visitor gets bounced to the main site.
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

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${webUrl()}/sign-in`)
  }

  const { data: profileRaw } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as UserRow | null

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.redirect(`${webUrl()}/dashboard`)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
