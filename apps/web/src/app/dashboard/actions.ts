'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { trackProfileUpdated, trackNotificationPreferenceUpdated } from '@pshq/analytics'
import { sanitizeAreas } from '@/app/dashboard/constants'
import type { PrivacyTier, ExperienceLevel } from '@pshq/database'

export interface ProfileState {
  error?: string
  success?: boolean
}

const USERNAME_RE = /^[a-z0-9_]{3,30}$/

function str(formData: FormData, key: string, maxLen: number): string {
  return (formData.get(key) as string ?? '').trim().slice(0, maxLen)
}

const PRIVACY_TIERS: PrivacyTier[] = ['public', 'community', 'private']
const EXPERIENCE_LEVELS: ExperienceLevel[] = ['exploring', 'beginner', 'intermediate', 'senior', 'leader']

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const first_name = str(formData, 'first_name', 100)
  const last_name  = str(formData, 'last_name', 100)
  const job_role   = str(formData, 'job_role', 150)
  const country    = str(formData, 'country', 100)
  const bio        = str(formData, 'bio', 2000) || null
  const areasRaw   = formData.getAll('areas_of_interest') as string[]
  const areas_of_interest = sanitizeAreas(areasRaw)
  const full_name  = [first_name, last_name].filter(Boolean).join(' ') || null

  // Epic D fields — username editable any time (JT decision, not a
  // one-time claim), lowercased + validated before it ever reaches the
  // DB's case-insensitive unique index.
  const usernameRaw = str(formData, 'username', 30).toLowerCase()
  let username: string | null = usernameRaw || null
  if (username && !USERNAME_RE.test(username)) {
    return { error: 'Username must be 3-30 characters: lowercase letters, numbers, and underscores only.' }
  }

  const headline    = str(formData, 'headline', 150) || null
  const company     = str(formData, 'company', 150) || null
  const region      = str(formData, 'region', 100) || null
  const years_experience_raw = str(formData, 'years_experience', 3)
  const years_experience = years_experience_raw ? Math.max(0, Math.min(60, parseInt(years_experience_raw, 10) || 0)) : null
  const experience_level_raw = formData.get('experience_level') as string
  const experience_level: ExperienceLevel | null = EXPERIENCE_LEVELS.includes(experience_level_raw as ExperienceLevel) ? experience_level_raw as ExperienceLevel : null
  const skillsRaw = str(formData, 'skills', 500)
  const skills = skillsRaw ? Array.from(new Set(skillsRaw.split(',').map(s => s.trim()).filter(Boolean))).slice(0, 20) : []
  const linkedin_url  = str(formData, 'linkedin_url', 300) || null
  const website_url   = str(formData, 'website_url', 300) || null
  const portfolio_url = str(formData, 'portfolio_url', 300) || null
  const github_url    = str(formData, 'github_url', 300) || null
  const x_url          = str(formData, 'x_url', 300) || null
  const privacy_tier_raw = formData.get('privacy_tier') as string
  const privacy_tier: PrivacyTier = PRIVACY_TIERS.includes(privacy_tier_raw as PrivacyTier) ? privacy_tier_raw as PrivacyTier : 'community'
  const topicNames = formData.getAll('topics') as string[]
  const goalNames = formData.getAll('goals') as string[]

  const service = createServiceClient()
  const { error } = await service
    .from('users')
    .update({
      first_name, last_name, full_name, job_role, country, bio, areas_of_interest,
      username, headline, company, region, years_experience, experience_level,
      skills, linkedin_url, website_url, portfolio_url, github_url, x_url, privacy_tier,
    })
    .eq('id', user.id)

  if (error) {
    // Postgres unique_violation
    if (error.code === '23505') return { error: 'That username is already taken.' }
    return { error: 'Failed to save profile. Try again.' }
  }

  // Topics/goals are separate join tables (fixed taxonomy, many-to-many) —
  // simplest correct sync for a settings form is delete-then-insert-selected,
  // same shape the onboarding flow already uses for these tables.
  const [{ data: allTopics }, { data: allGoals }] = await Promise.all([
    supabase.from('topics').select('id, name'),
    supabase.from('goals').select('id, name'),
  ])
  const topicIds = (allTopics ?? []).filter(t => topicNames.includes(t.name)).map(t => t.id)
  const goalIds = (allGoals ?? []).filter(g => goalNames.includes(g.name)).map(g => g.id)

  await supabase.from('user_topics').delete().eq('user_id', user.id)
  if (topicIds.length > 0) await supabase.from('user_topics').insert(topicIds.map(topic_id => ({ user_id: user.id, topic_id })))

  await supabase.from('user_goals').delete().eq('user_id', user.id)
  if (goalIds.length > 0) {
    // Max 5 enforced by a DB trigger — insert one at a time so a violation
    // on item 6 doesn't also roll back items 1-5 the user is entitled to.
    for (const goal_id of goalIds.slice(0, 5)) {
      await supabase.from('user_goals').insert({ user_id: user.id, goal_id })
    }
  }

  await trackProfileUpdated({ supabase, source: 'web', userId: user.id }, Object.keys({
    first_name, last_name, job_role, country, bio, areas_of_interest, username, headline,
    company, region, years_experience, experience_level, skills, linkedin_url, website_url,
    portfolio_url, github_url, x_url, privacy_tier, topics: topicIds, goals: goalIds,
  }))

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  if (username) revalidatePath(`/profile/${username}`)
  return { success: true }
}

export async function sendPasswordResetAction(): Promise<ProfileState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'No email on account.' }

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  })

  if (error) return { error: error.message }
  return { success: true }
}

// ── Notification preferences (Epic D §D.7) ──────────────────────────────
// notification_preferences was a schema skeleton with zero UI until now
// (see packages/database migration 20260901000022's own comment). One row
// per (user, key); missing row = default enabled, matching NOTIFICATION_TYPES'
// defaultEnabled in the settings page.
export async function toggleNotificationPreferenceAction(key: string, enabled: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase.from('notification_preferences').upsert(
    { user_id: user.id, key, enabled },
    { onConflict: 'user_id,key' }
  )
  if (error) return { error: error.message }

  await trackNotificationPreferenceUpdated({ supabase, source: 'web', userId: user.id }, key, enabled)
  revalidatePath('/dashboard/settings')
  return {}
}
