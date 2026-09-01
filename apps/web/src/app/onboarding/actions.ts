'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { PRIMARY_ROLES, GOALS, TOPICS, EXPERIENCE_LEVELS, MAX_GOALS } from '@pshq/api-client/onboarding'
import { trackOnboardingStarted, trackOnboardingStepCompleted, trackOnboardingCompleted } from '@pshq/analytics'
import type { ExperienceLevel } from '@pshq/database'

export type StepState = { error: string | null }

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

// Ensures an onboarding_progress row exists, and fires onboarding_started
// exactly once — the first time any step action actually runs for this user.
async function ensureProgressRow(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const service = createServiceClient()
  const { data: existing } = await service.from('onboarding_progress').select('user_id').eq('user_id', userId).maybeSingle()
  if (existing) return
  await service.from('onboarding_progress').insert({ user_id: userId })
  await trackOnboardingStarted({ supabase, source: 'web', userId })
}

// ─── Step: About You ────────────────────────────────────────────────────────

export async function saveAboutYouAction(_prev: StepState, formData: FormData): Promise<StepState> {
  const jobRole   = (formData.get('job_role')  as string ?? '').trim()
  const company   = (formData.get('company')   as string ?? '').trim()
  const country   = (formData.get('country')   as string ?? '').trim()
  const region    = (formData.get('region')    as string ?? '').trim()
  const headline  = (formData.get('headline')  as string ?? '').trim()

  if (!jobRole || !country) {
    return { error: 'Current job title and country are required.' }
  }

  const { supabase, user } = await requireUser()
  await ensureProgressRow(user.id, supabase)

  const service = createServiceClient()
  const { error } = await service.from('users').update({
    job_role: jobRole,
    company: company || null,
    country,
    region: region || null,
    headline: headline || null,
  }).eq('id', user.id)
  if (error) return { error: error.message }

  await service.from('onboarding_progress').update({ about_you_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', user.id)
  await trackOnboardingStepCompleted({ supabase, source: 'web', userId: user.id }, 'about_you')

  redirect('/onboarding?step=role')
}

// ─── Step: Role ─────────────────────────────────────────────────────────────

export async function saveRoleAction(_prev: StepState, formData: FormData): Promise<StepState> {
  const primaryRole = (formData.get('primary_role') as string ?? '').trim()
  const secondaryRoles = (formData.getAll('secondary_roles') as string[]).filter(Boolean)

  if (!primaryRole || !PRIMARY_ROLES.includes(primaryRole as typeof PRIMARY_ROLES[number])) {
    return { error: 'Select a primary role.' }
  }

  const { supabase, user } = await requireUser()
  const service = createServiceClient()

  const { data: roles } = await service.from('roles').select('id, name').in('name', [primaryRole, ...secondaryRoles])
  const roleIdByName = new Map((roles ?? []).map((r: { id: string; name: string }) => [r.name, r.id]))
  const primaryRoleId = roleIdByName.get(primaryRole)
  if (!primaryRoleId) return { error: 'Role list is out of sync — try again.' }

  const { error } = await service.from('users').update({ primary_role_id: primaryRoleId }).eq('id', user.id)
  if (error) return { error: error.message }

  await service.from('user_secondary_roles').delete().eq('user_id', user.id)
  const secondaryRows = secondaryRoles
    .filter(name => name !== primaryRole)
    .map(name => roleIdByName.get(name))
    .filter((id): id is string => !!id)
    .map(roleId => ({ user_id: user.id, role_id: roleId }))
  if (secondaryRows.length > 0) await service.from('user_secondary_roles').insert(secondaryRows)

  await service.from('onboarding_progress').update({ role_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', user.id)
  await trackOnboardingStepCompleted({ supabase, source: 'web', userId: user.id }, 'role')

  redirect('/onboarding?step=experience')
}

// ─── Step: Experience ───────────────────────────────────────────────────────

export async function saveExperienceAction(_prev: StepState, formData: FormData): Promise<StepState> {
  const level = (formData.get('experience_level') as string ?? '').trim()

  if (!EXPERIENCE_LEVELS.includes(level as typeof EXPERIENCE_LEVELS[number])) {
    return { error: 'Select your experience level.' }
  }

  const { supabase, user } = await requireUser()
  const service = createServiceClient()

  const { error } = await service.from('users').update({ experience_level: level as ExperienceLevel }).eq('id', user.id)
  if (error) return { error: error.message }

  await service.from('onboarding_progress').update({ experience_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', user.id)
  await trackOnboardingStepCompleted({ supabase, source: 'web', userId: user.id }, 'experience')

  redirect('/onboarding?step=goals')
}

// ─── Step: Goals ────────────────────────────────────────────────────────────

export async function saveGoalsAction(_prev: StepState, formData: FormData): Promise<StepState> {
  const selected = (formData.getAll('goals') as string[]).filter(name => GOALS.includes(name as typeof GOALS[number]))

  if (selected.length === 0) return { error: 'Select at least one goal.' }
  if (selected.length > MAX_GOALS) return { error: `Select up to ${MAX_GOALS} goals.` }

  const { supabase, user } = await requireUser()
  const service = createServiceClient()

  const { data: goalRows } = await service.from('goals').select('id, name').in('name', selected)
  await service.from('user_goals').delete().eq('user_id', user.id)
  const rows = (goalRows ?? []).map((g: { id: string }) => ({ user_id: user.id, goal_id: g.id }))
  if (rows.length > 0) {
    const { error } = await service.from('user_goals').insert(rows)
    if (error) return { error: 'Could not save goals — try again.' }
  }

  await service.from('onboarding_progress').update({ goals_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', user.id)
  await trackOnboardingStepCompleted({ supabase, source: 'web', userId: user.id }, 'goals')

  redirect('/onboarding?step=topics')
}

// ─── Step: Topics (final step — completes onboarding) ──────────────────────

export async function saveTopicsAction(_prev: StepState, formData: FormData): Promise<StepState> {
  const selected = (formData.getAll('topics') as string[]).filter(name => TOPICS.includes(name as typeof TOPICS[number]))

  if (selected.length === 0) return { error: 'Select at least one topic.' }

  const { supabase, user } = await requireUser()
  const service = createServiceClient()

  const { data: topicRows } = await service.from('topics').select('id, name').in('name', selected)
  await service.from('user_topics').delete().eq('user_id', user.id)
  const rows = (topicRows ?? []).map((t: { id: string }) => ({ user_id: user.id, topic_id: t.id }))
  if (rows.length > 0) {
    const { error } = await service.from('user_topics').insert(rows)
    if (error) return { error: 'Could not save topics — try again.' }
  }

  const now = new Date().toISOString()
  await service.from('onboarding_progress').update({ topics_completed_at: now, completed_at: now, updated_at: now }).eq('user_id', user.id)
  await service.from('users').update({ onboarding_done: true }).eq('id', user.id)

  await trackOnboardingStepCompleted({ supabase, source: 'web', userId: user.id }, 'topics')
  await trackOnboardingCompleted({ supabase, source: 'web', userId: user.id })

  redirect('/onboarding/complete')
}
