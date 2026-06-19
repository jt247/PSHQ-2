import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserRow } from '@/types/database'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  // Ensure `next` is a relative path to prevent open-redirect attacks.
  const safeNext = next.startsWith('/') ? next : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const userId = data.user.id

      // Upsert the users row — handles both email confirm and OAuth.
      // For OAuth sign-ups the trigger already fired, but we patch in
      // auth_provider and any metadata Supabase collected from Google.
      const meta = data.user.user_metadata ?? {}
      await supabase.from('users').upsert(
        {
          id: userId,
          email: data.user.email!,
          full_name: meta.full_name ?? meta.name ?? null,
          first_name: meta.given_name ?? meta.first_name ?? null,
          last_name: meta.family_name ?? meta.last_name ?? null,
          avatar_url: meta.avatar_url ?? meta.picture ?? null,
          auth_provider: data.user.app_metadata?.provider ?? 'email',
        },
        { onConflict: 'id', ignoreDuplicates: false }
      )

      // If this is a password reset flow, go where the link points.
      if (safeNext !== '/dashboard') {
        return NextResponse.redirect(`${origin}${safeNext}`)
      }

      // Check onboarding status.
      const { data: profileRaw } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      const profile = profileRaw as UserRow | null

      if (!profile?.onboarding_done) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      if (profile.role === 'admin' || profile.role === 'super_admin') {
        return NextResponse.redirect(`${origin}/admin`)
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // Auth failed — send to sign-in with an error param.
  return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`)
}
