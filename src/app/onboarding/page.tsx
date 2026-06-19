'use client'

import { useActionState } from 'react'
import { onboardingAction, type OnboardingState } from '@/app/(auth)/actions/auth'

const initial: OnboardingState = { error: null }

const AREAS = [
  'Product Strategy',
  'User Research',
  'Product Analytics',
  'Growth',
  'Design',
  'Engineering',
  'Leadership',
  'Career Development',
]

export default function OnboardingPage() {
  const [state, action, pending] = useActionState(onboardingAction, initial)

  return (
    <div className="auth-container">
      <h1>One last step</h1>
      <p>Tell us a bit about yourself so we can tailor your experience.</p>

      <form action={action} className="auth-form">
        <div className="auth-field">
          <label htmlFor="job_role">Your role</label>
          <input
            id="job_role"
            name="job_role"
            type="text"
            placeholder="e.g. Product Manager, Founder, Designer"
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="country">Country</label>
          <input
            id="country"
            name="country"
            type="text"
            placeholder="e.g. Nigeria, UK, US"
            required
          />
        </div>

        <fieldset className="auth-field">
          <legend>Areas of interest <span className="auth-hint">(select all that apply)</span></legend>
          <div className="auth-checkboxes">
            {AREAS.map(area => (
              <label key={area} className="auth-checkbox-label">
                <input type="checkbox" name="areas_of_interest" value={area} />
                {area}
              </label>
            ))}
          </div>
        </fieldset>

        {state.error && <p className="auth-error" role="alert">{state.error}</p>}

        <button type="submit" disabled={pending} className="auth-submit">
          {pending ? 'Saving…' : 'Go to dashboard'}
        </button>
      </form>
    </div>
  )
}
