'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { onboardingAction, type OnboardingState } from '@/app/(auth)/actions/auth'
import { AREAS } from '@/app/dashboard/constants'

const initial: OnboardingState = { error: null }
const MAX_AREAS = 7

export default function OnboardingPage() {
  const [state, action, pending] = useActionState(onboardingAction, initial)
  const [selected, setSelected] = useState<string[]>([])

  function toggleArea(area: string) {
    setSelected(prev =>
      prev.includes(area)
        ? prev.filter(a => a !== area)
        : prev.length < MAX_AREAS ? [...prev, area] : prev
    )
  }

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
                  Areas of interest{' '}
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>({selected.length}/{MAX_AREAS} selected)</span>
                </legend>
                {selected.map(a => (
                  <input key={a} type="hidden" name="areas_of_interest" value={a} />
                ))}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {AREAS.map(area => {
                    const isSelected = selected.includes(area)
                    const isDisabled = !isSelected && selected.length >= MAX_AREAS
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => toggleArea(area)}
                        disabled={isDisabled}
                        className="text-label-sm"
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: isSelected ? 'var(--color-ink-deep)' : 'var(--color-paper-darker)',
                          border: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)',
                          borderRadius: '0.125rem',
                          color: isSelected ? '#ffffff' : 'var(--color-ink-deep)',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.5 : 1,
                        }}
                      >
                        {area}
                      </button>
                    )
                  })}
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
