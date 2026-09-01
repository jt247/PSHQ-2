'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { trackSignupStarted, trackSignupCompleted } from '@pshq/analytics'
import { rateLimit, clientIp } from '@/lib/ratelimit'
import type { UserRow } from '@pshq/database'
import { adminUrl } from '@/lib/admin-url'

// ─── Sign Up ────────────────────────────────────────────────────────────────

export type SignUpState = {
  error: string | null
  success: boolean
}

export async function signUpAction(
  _prev: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const firstName   = formData.get('first_name')   as string
  const lastName    = formData.get('last_name')    as string
  const email       = formData.get('email')        as string
  const password    = formData.get('password')     as string
  const inviteToken = (formData.get('invite_token') as string ?? '').trim()

  if (!firstName || !lastName || !email || !password) {
    return { error: 'All fields are required.', success: false }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.', success: false }
  }

  // Cap account creation per IP: 5 per hour. Ad traffic is exactly when
  // automated mass-signup gets attempted.
  const signUpAllowed = await rateLimit('sign-up', clientIp(await headers()), 5, 3600)
  if (!signUpAllowed) {
    return { error: 'Too many sign-up attempts. Please try again in an hour.', success: false }
  }

  // No anonymous_id wired up yet (would need a pre-auth tracking cookie,
  // e.g. reusing PostHog's own distinct_id) — event still records, just
  // without a way to correlate it back to whoever becomes this user later.
  const trackingClient = await createClient()
  await trackSignupStarted({ supabase: trackingClient, source: 'web' })

  // Validate invite token if present
  let inviteTeamRole: string | null = null
  if (inviteToken) {
    const service = createServiceClient()
    const { data: invite } = await service
      .from('admin_invites')
      .select('id, email, team_role, expires_at, used_at')
      .eq('token', inviteToken)
      .single()

    if (!invite || invite.used_at || new Date(invite.expires_at) < new Date()) {
      return { error: 'This invite link is invalid or has expired.', success: false }
    }
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      return { error: `This invite was sent to ${invite.email}. Please use that email address.`, success: false }
    }
    inviteTeamRole = invite.team_role
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        auth_provider: 'email',
        // Store invite metadata in user_metadata so the callback can read it
        ...(inviteToken ? { invite_token: inviteToken, invite_team_role: inviteTeamRole } : {}),
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message, success: false }
  }

  // signUp() returns the new user immediately even though email
  // confirmation is still pending — real signal to correlate against.
  await trackSignupCompleted({ supabase, source: 'web', userId: data.user?.id })

  return { error: null, success: true }
}

// ─── Sign In ────────────────────────────────────────────────────────────────

export type SignInState = {
  error: string | null
}

export async function signInAction(
  _prev: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email    = formData.get('email')    as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  // Cap login attempts per IP: 10 per 5 minutes. Generous for a real user
  // fumbling their password, tight enough to blunt credential stuffing.
  const signInAllowed = await rateLimit('sign-in', clientIp(await headers()), 10, 300)
  if (!signInAllowed) {
    return { error: 'Too many sign-in attempts. Please wait a few minutes and try again.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  const { id: userId, user_metadata: meta = {}, app_metadata = {} } = data.user

  // Ensure public.users row exists — repairs accounts created before migrations ran.
  // ignoreDuplicates: true preserves onboarding_done and other profile fields on subsequent logins.
  const service = createServiceClient()
  await service.from('users').upsert(
    {
      id: userId,
      email: data.user.email!,
      full_name: meta.full_name ?? meta.name ?? null,
      first_name: meta.given_name ?? meta.first_name ?? null,
      last_name: meta.family_name ?? meta.last_name ?? null,
      avatar_url: meta.avatar_url ?? meta.picture ?? null,
      auth_provider: app_metadata.provider ?? 'email',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  const { data: profileRaw } = await service
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  const profile = profileRaw as UserRow | null

  if (profile?.role === 'admin' || profile?.role === 'super_admin') {
    redirect(adminUrl())
  }

  // Onboarding is no longer a forced redirect (Epic A.4) — the dashboard
  // itself shows the progress card for anyone who hasn't finished it.
  redirect('/dashboard')
}

// ─── Sign Out ───────────────────────────────────────────────────────────────

export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/sign-in')
}

// ─── Forgot Password ────────────────────────────────────────────────────────

export type ForgotPasswordState = {
  error: string | null
  success: boolean
}

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required.', success: false }
  }

  // Cap reset requests per IP: 3 per 10 minutes — same shape as the contact
  // form's limit, prevents using this as a free email-bombing vector.
  const resetAllowed = await rateLimit('forgot-password', clientIp(await headers()), 3, 600)
  if (!resetAllowed) {
    return { error: 'Too many reset attempts. Please try again in a few minutes.', success: false }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { error: error.message, success: false }
  }

  return { error: null, success: true }
}

// ─── Reset Password ──────────────────────────────────────────────────────────

export type ResetPasswordState = {
  error: string | null
  success: boolean
}

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password        = formData.get('password')         as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!password || !confirmPassword) {
    return { error: 'Both fields are required.', success: false }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.', success: false }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.', success: false }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message, success: false }
  }

  redirect('/dashboard')
}

// Onboarding is now a multi-step wizard — see src/app/onboarding/actions.ts.
