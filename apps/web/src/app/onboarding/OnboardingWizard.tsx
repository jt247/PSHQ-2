'use client'

import { useActionState } from 'react'
import {
  saveAboutYouAction, saveRoleAction, saveExperienceAction, saveGoalsAction, saveTopicsAction,
  type StepState,
} from './actions'
import { ChipSingleSelect, ChipMultiSelect } from '@/components/onboarding/ChipSelect'
import { PRIMARY_ROLES, GOALS, TOPICS, EXPERIENCE_LEVELS, EXPERIENCE_LEVEL_LABELS, MAX_GOALS } from '@pshq/api-client/onboarding'

export type Step = 'about_you' | 'role' | 'experience' | 'goals' | 'topics'

const STEPS: Step[] = ['about_you', 'role', 'experience', 'goals', 'topics']
const STEP_LABELS: Record<Step, string> = {
  about_you: 'About You',
  role: 'Role',
  experience: 'Experience',
  goals: 'Goals',
  topics: 'Topics',
}

interface Initial {
  jobRole: string | null
  company: string | null
  country: string | null
  region: string | null
  headline: string | null
  primaryRole: string | null
  secondaryRoles: string[]
  experienceLevel: string | null
  goals: string[]
  topics: string[]
}

const initState: StepState = { error: null }

export function OnboardingWizard({ step, initial }: { step: Step; initial: Initial }) {
  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="auth-card" style={{ maxWidth: '560px' }}>
      <div className="auth-card-inner">
        {/* Progress */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem' }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{
                flex: 1, height: '4px', borderRadius: '2px',
                background: i <= stepIndex ? 'var(--color-accent-warm)' : 'color-mix(in srgb, var(--color-tertiary) 12%, transparent)',
              }} />
            ))}
          </div>
          <p className="text-label-sm" style={{ color: 'var(--color-text-muted)' }}>
            Step {stepIndex + 1} of {STEPS.length} — {STEP_LABELS[step]}
          </p>
        </div>

        {step === 'about_you' && <AboutYouStep initial={initial} />}
        {step === 'role' && <RoleStep initial={initial} />}
        {step === 'experience' && <ExperienceStep initial={initial} />}
        {step === 'goals' && <GoalsStep initial={initial} />}
        {step === 'topics' && <TopicsStep initial={initial} />}
      </div>
    </div>
  )
}

function AboutYouStep({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState(saveAboutYouAction, initState)
  return (
    <form action={action} className="auth-form">
      <h1 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>Tell us about yourself</h1>
      <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
        We&apos;ll use this to tailor your experience and surface the most relevant content.
      </p>

      <div className="auth-field">
        <label htmlFor="job_role">Current job title</label>
        <input id="job_role" name="job_role" type="text" defaultValue={initial.jobRole ?? ''} placeholder="e.g. Senior Product Manager" required />
      </div>
      <div className="auth-field">
        <label htmlFor="headline">Professional headline</label>
        <input id="headline" name="headline" type="text" defaultValue={initial.headline ?? ''} placeholder="e.g. Founder building AI products" />
      </div>
      <div className="auth-field">
        <label htmlFor="company">Company (optional)</label>
        <input id="company" name="company" type="text" defaultValue={initial.company ?? ''} />
      </div>
      <div className="auth-row">
        <div className="auth-field">
          <label htmlFor="country">Country</label>
          <input id="country" name="country" type="text" defaultValue={initial.country ?? ''} placeholder="e.g. Nigeria" required />
        </div>
        <div className="auth-field">
          <label htmlFor="region">State / region</label>
          <input id="region" name="region" type="text" defaultValue={initial.region ?? ''} placeholder="e.g. Lagos" />
        </div>
      </div>

      {state.error && <p className="auth-error" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="auth-submit">{pending ? 'Saving…' : 'Continue →'}</button>
    </form>
  )
}

function RoleStep({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState(saveRoleAction, initState)
  return (
    <form action={action} className="auth-form">
      <h1 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>What&apos;s your role?</h1>
      <fieldset className="auth-field" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="text-body-sm" style={{ fontWeight: 500, color: 'var(--color-ink-deep)', marginBottom: '0.625rem' }}>Primary role</legend>
        <ChipSingleSelect name="primary_role" options={PRIMARY_ROLES} initial={initial.primaryRole} />
      </fieldset>
      <fieldset className="auth-field" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="text-body-sm" style={{ fontWeight: 500, color: 'var(--color-ink-deep)', marginBottom: '0.625rem' }}>Also interested in (optional)</legend>
        <ChipMultiSelect name="secondary_roles" options={PRIMARY_ROLES} initial={initial.secondaryRoles} />
      </fieldset>
      {state.error && <p className="auth-error" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="auth-submit">{pending ? 'Saving…' : 'Continue →'}</button>
    </form>
  )
}

function ExperienceStep({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState(saveExperienceAction, initState)
  return (
    <form action={action} className="auth-form">
      <h1 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>Where are you in your journey?</h1>
      <ChipSingleSelect name="experience_level" options={EXPERIENCE_LEVELS} initial={initial.experienceLevel} labels={EXPERIENCE_LEVEL_LABELS} />
      {state.error && <p className="auth-error" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="auth-submit">{pending ? 'Saving…' : 'Continue →'}</button>
    </form>
  )
}

function GoalsStep({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState(saveGoalsAction, initState)
  return (
    <form action={action} className="auth-form">
      <h1 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>What are you here to do?</h1>
      <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Pick up to {MAX_GOALS}.</p>
      <ChipMultiSelect name="goals" options={GOALS} initial={initial.goals} max={MAX_GOALS} />
      {state.error && <p className="auth-error" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="auth-submit">{pending ? 'Saving…' : 'Continue →'}</button>
    </form>
  )
}

function TopicsStep({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState(saveTopicsAction, initState)
  return (
    <form action={action} className="auth-form">
      <h1 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>Pick your topics</h1>
      <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
        You can change these later from account settings.
      </p>
      <ChipMultiSelect name="topics" options={TOPICS} initial={initial.topics} />
      {state.error && <p className="auth-error" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="auth-submit">{pending ? 'Saving…' : 'Finish →'}</button>
    </form>
  )
}
