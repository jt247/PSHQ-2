import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { trackEmailVerified, trackSignupCompleted, trackCohortAssigned } from '@pshq/analytics'
import type { UserRow } from '@pshq/database'
import { adminUrl } from '@/lib/admin-url'

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
        const service = createServiceClient()
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

      // Epic J §J.1-J.4 — consumes any real cohort_invites row queued for
      // this email (an admin pasted it in before this person signed up)
      // and converts it into a real cohort_memberships row. Every call
      // here operates on a real just-created account; nothing is
      // fabricated. Safe to call on every login, not just signup — it's a
      // no-op once an invite is already consumed.
      if (data.user.email) {
        const service = createServiceClient()
        const { data: newlyAssigned } = await service.rpc('consume_cohort_invites', { p_user_id: userId, p_email: data.user.email })
        for (const cohort of (newlyAssigned ?? []) as string[]) {
          await trackCohortAssigned({ supabase, source: 'web', userId }, cohort)
        }
      }

      // Password reset flow
      if (safeNext !== '/dashboard') {
        return NextResponse.redirect(`${origin}${safeNext}`)
      }

      // This callback handles both email-link confirmation and the Google
      // OAuth redirect — only the email/password flow actually needs email
      // verification, so that's the signal for whether this specific hit
      // represents "a user just verified their email."
      if (data.user.app_metadata?.provider === 'email') {
        await trackEmailVerified({ supabase, source: 'web', userId })
      }

      // Epic H discovery — this route (the Google OAuth path, the primary
      // signup option on the sign-in page) never fired signup_completed at
      // all, only email/password did. That meant the funnel was
      // systematically undercounting real signups. auth.users.created_at
      // within the last minute of this callback is the standard signal for
      // "this OAuth exchange just created a brand-new account" — an
      // existing user signing back in has a created_at from long before.
      if (data.user.app_metadata?.provider !== 'email') {
        const createdAt = new Date(data.user.created_at).getTime()
        if (Date.now() - createdAt < 60_000) {
          await trackSignupCompleted({ supabase, source: 'web', userId })
        }
      }

      const { data: profileRaw } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      const profile = profileRaw as UserRow | null

      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        return NextResponse.redirect(adminUrl())
      }

      // Onboarding is no longer a forced redirect (Epic A.4) — land on the
      // dashboard either way, which shows the onboarding progress card for
      // anyone who hasn't finished it. Articles stay accessible either
      // way; only specific features gate on requireOnboarded().
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`)
}
