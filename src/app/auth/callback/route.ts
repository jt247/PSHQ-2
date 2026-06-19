import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { UserRow } from '@/types/database'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const safeNext = next.startsWith('/') ? next : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const userId = data.user.id
      const meta   = data.user.user_metadata ?? {}

      // Upsert public.users row — handles email confirm and OAuth
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

      // Handle admin invite: if the user signed up via an invite link,
      // promote them to admin + set team_role and mark invite used.
      const inviteToken: string | undefined = meta.invite_token
      const inviteTeamRole: string | undefined = meta.invite_team_role

      if (inviteToken) {
        const service = await createServiceClient()
        const { data: invite } = await service
          .from('admin_invites')
          .select('id, email, team_role, used_at, expires_at')
          .eq('token', inviteToken)
          .single()

        if (invite && !invite.used_at && new Date(invite.expires_at) >= new Date()) {
          // Promote user to admin
          await service
            .from('users')
            .update({ role: 'admin', team_role: inviteTeamRole ?? invite.team_role })
            .eq('id', userId)

          // Mark invite consumed
          await service
            .from('admin_invites')
            .update({ used_at: new Date().toISOString() })
            .eq('id', invite.id)
        }
      }

      // Password reset flow
      if (safeNext !== '/dashboard') {
        return NextResponse.redirect(`${origin}${safeNext}`)
      }

      // Check onboarding and role
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

  return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`)
}
