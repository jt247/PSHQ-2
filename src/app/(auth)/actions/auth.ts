'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { UserRow } from '@/types/database'

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

  // Validate invite token if present
  let inviteTeamRole: string | null = null
  if (inviteToken) {
    const service = await createServiceClient()
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

  const { error } = await supabase.auth.signUp({
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

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  const { data: profileRaw } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single()
  const profile = profileRaw as UserRow | null

  if (profile && !profile.onboarding_done) {
    redirect('/onboarding')
  }

  if (profile?.role === 'admin' || profile?.role === 'super_admin') {
    redirect('/admin')
  }

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

// ─── Onboarding ──────────────────────────────────────────────────────────────

export type OnboardingState = {
  error: string | null
}

export async function onboardingAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const jobRole  = formData.get('job_role')  as string
  const country  = formData.get('country')   as string
  const areasRaw = formData.getAll('areas_of_interest') as string[]

  if (!jobRole || !country) {
    return { error: 'Job role and country are required.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated.' }
  }

  const { error } = await supabase
    .from('users')
    .update({ job_role: jobRole, country, areas_of_interest: areasRaw, onboarding_done: true })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  // Check role to redirect admin invitees to the right place
  const { data: profileRaw } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profileRaw as Pick<UserRow, 'role'> | null)?.role

  if (role === 'admin' || role === 'super_admin') {
    redirect('/admin')
  }

  redirect('/dashboard')
}
