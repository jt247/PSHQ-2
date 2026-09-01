import type { SupabaseClient } from '@supabase/supabase-js'

// Single source of truth for onboarding step option lists — both apps/web
// and apps/mobile import these instead of hand-copying the picker options,
// so they can never drift from what's actually seeded in the `roles`,
// `goals`, and `topics` tables (see migration 20260901000022).
export const PRIMARY_ROLES = [
  'Product Manager', 'Founder', 'Product Designer', 'Engineer',
  'Product Marketer', 'Growth Professional', 'Product Operations',
  'Project Manager', 'Student', 'Career Switcher', 'Product Leader', 'Other',
] as const

export const GOALS = [
  'Break into product', 'Improve my product craft', 'Learn AI',
  'Become an AI Product Manager', 'Become more technical', 'Build a startup',
  'Build a software product', 'Improve GTM', 'Learn growth',
  'Improve product leadership', 'Build my portfolio', 'Find a product job',
  'Prepare for interviews', 'Learn software engineering', 'Build with AI',
  'Improve product marketing',
] as const

export const TOPICS = [
  'Product Strategy', 'Product Discovery', 'User Research', 'Product Analytics',
  'Product Operations', 'Growth', 'GTM', 'Product Marketing',
  'AI Product Management', 'AI Engineering', 'Software Engineering',
  'Startup Building', 'Leadership', 'Career Development', 'Product Design',
  'Experimentation',
] as const

export const EXPERIENCE_LEVELS = ['exploring', 'beginner', 'intermediate', 'senior', 'leader'] as const

export const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  exploring: 'Exploring',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  senior: 'Senior',
  leader: 'Leader',
}

export const MAX_GOALS = 5

// The single gate both apps check before letting a user into anything that
// requires a completed profile — templates, downloads, ebooks, learning
// paths, collections, AI personalization, case participation, achievements,
// the personalized dashboard. Articles are explicitly NOT gated (Epic A.3).
//
// `users.onboarding_done` is the one source of truth for "is this user
// onboarded" — set true by the last real step of the wizard. It predates
// this epic (the old single-step onboarding also set it), so existing
// onboarded users are grandfathered automatically; `onboarding_progress`
// tracks step-by-step resume state but is never itself the gate.
export async function isOnboarded(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from('users').select('onboarding_done').eq('id', userId).single()
  return (data as { onboarding_done?: boolean } | null)?.onboarding_done ?? false
}
