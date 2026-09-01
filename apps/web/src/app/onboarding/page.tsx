import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@pshq/api-client/server'
import type { UserRow, OnboardingProgressRow } from '@pshq/database'
import { OnboardingWizard, type Step } from './OnboardingWizard'

interface Props { searchParams: Promise<{ step?: string }> }

const STEP_ORDER: Step[] = ['about_you', 'role', 'experience', 'goals', 'topics']

// Whichever step's *_completed_at is still null, in order, is where a user
// who left mid-way resumes — this is the entire "resume" mechanism.
function firstIncompleteStep(progress: OnboardingProgressRow | null): Step {
  if (!progress) return 'about_you'
  if (!progress.about_you_completed_at) return 'about_you'
  if (!progress.role_completed_at) return 'role'
  if (!progress.experience_completed_at) return 'experience'
  if (!progress.goals_completed_at) return 'goals'
  return 'topics'
}

export default async function OnboardingPage({ searchParams }: Props) {
  const { step: stepParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?redirect=/onboarding')

  const [profileRes, progressRes, secondaryRolesRes, goalsRes, topicsRes, primaryRoleRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('onboarding_progress').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('user_secondary_roles').select('role:roles(name)').eq('user_id', user.id),
    supabase.from('user_goals').select('goal:goals(name)').eq('user_id', user.id),
    supabase.from('user_topics').select('topic:topics(name)').eq('user_id', user.id),
    supabase.from('users').select('primary_role_id, roles:primary_role_id(name)').eq('id', user.id).single(),
  ])

  const profile = profileRes.data as UserRow | null
  if (profile?.onboarding_done) redirect('/dashboard')

  const progress = progressRes.data as OnboardingProgressRow | null
  const requested = stepParam as Step | undefined
  const step = requested && STEP_ORDER.includes(requested) ? requested : firstIncompleteStep(progress)

  const primaryRoleName = (primaryRoleRes.data as unknown as { roles: { name: string } | null } | null)?.roles?.name ?? null
  const secondaryRoleNames = ((secondaryRolesRes.data ?? []) as unknown as Array<{ role: { name: string } | null }>)
    .map(r => r.role?.name).filter((n): n is string => !!n)
  const goalNames = ((goalsRes.data ?? []) as unknown as Array<{ goal: { name: string } | null }>)
    .map(g => g.goal?.name).filter((n): n is string => !!n)
  const topicNames = ((topicsRes.data ?? []) as unknown as Array<{ topic: { name: string } | null }>)
    .map(t => t.topic?.name).filter((n): n is string => !!n)

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link href="/" className="auth-brand">Product Slice HQ</Link>
      </header>
      <main className="auth-main">
        <OnboardingWizard
          step={step}
          initial={{
            jobRole: profile?.job_role ?? null,
            company: profile?.company ?? null,
            country: profile?.country ?? null,
            region: profile?.region ?? null,
            headline: profile?.headline ?? null,
            primaryRole: primaryRoleName,
            secondaryRoles: secondaryRoleNames,
            experienceLevel: profile?.experience_level ?? null,
            goals: goalNames,
            topics: topicNames,
          }}
        />
      </main>
    </div>
  )
}
