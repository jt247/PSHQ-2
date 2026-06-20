'use client'

import Link from 'next/link'
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
    <div className="auth-page">
      <header className="auth-header">
        <Link href="/" className="auth-brand">Product Slice HQ</Link>
      </header>

      <main className="auth-main">
        <div className="auth-card" style={{ maxWidth: '520px' }}>
          <div className="auth-card-inner">
            <div style={{ marginBottom: '1.75rem' }}>
              <p className="text-label-sm" style={{ color: 'var(--color-accent-warm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
                One last step
              </p>
              <h1 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>
                Tell us about yourself
              </h1>
              <p className="text-body-md" style={{ color: 'var(--color-text-muted)' }}>
                We&apos;ll use this to tailor your experience and surface the most relevant content.
              </p>
            </div>

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

              <fieldset className="auth-field" style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend className="text-body-sm" style={{ fontWeight: 500, color: 'var(--color-ink-deep)', marginBottom: '0.75rem', display: 'block' }}>
                  Areas of interest <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(select all that apply)</span>
                </legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {AREAS.map(area => (
                    <label key={area} style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      cursor: 'pointer',
                    }}>
                      <input type="checkbox" name="areas_of_interest" value={area} style={{ accentColor: 'var(--color-ink-deep)' }} />
                      <span className="text-label-sm" style={{
                        padding: '0.25rem 0.75rem',
                        background: 'var(--color-paper-darker)',
                        border: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)',
                        borderRadius: '0.125rem',
                        color: 'var(--color-ink-deep)',
                        cursor: 'pointer',
                      }}>
                        {area}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {state.error && <p className="auth-error" role="alert">{state.error}</p>}

              <button type="submit" disabled={pending} className="auth-submit">
                {pending ? 'Saving…' : 'GO TO DASHBOARD →'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
