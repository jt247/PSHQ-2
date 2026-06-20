'use client'

import { useState, useActionState } from 'react'
import { updateProfileAction, sendPasswordResetAction, type ProfileState } from '@/app/dashboard/actions'
import { AREAS } from '@/app/dashboard/constants'
import type { UserRow } from '@/types/database'

const initState: ProfileState = {}

const COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Ethiopia', 'Tanzania',
  'Uganda', 'Senegal', 'Rwanda', 'Cameroon', 'Ivory Coast', 'Zimbabwe',
  'Zambia', 'Mozambique', 'Other',
]

export function ProfileSettings({ user }: { user: UserRow }) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initState)
  const [selected, setSelected] = useState<string[]>(user.areas_of_interest ?? [])
  const [resetMsg, setResetMsg] = useState<string | null>(null)

  function toggleArea(area: string) {
    setSelected(prev =>
      prev.includes(area)
        ? prev.filter(a => a !== area)
        : prev.length < 7 ? [...prev, area] : prev
    )
  }

  async function handleReset() {
    setResetMsg('Sending…')
    const result = await sendPasswordResetAction()
    setResetMsg(result.success ? 'Reset email sent! Check your inbox.' : result.error ?? 'Failed.')
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 1.5rem' }}>
        Profile & Settings
      </h2>

      <form action={formAction} className="settings-form">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="settings-field">
            <label htmlFor="first_name">First name</label>
            <input id="first_name" name="first_name" defaultValue={user.first_name ?? ''} placeholder="Ada" />
          </div>
          <div className="settings-field">
            <label htmlFor="last_name">Last name</label>
            <input id="last_name" name="last_name" defaultValue={user.last_name ?? ''} placeholder="Lovelace" />
          </div>
        </div>

        <div className="settings-field">
          <label htmlFor="job_role">Job title / role</label>
          <input id="job_role" name="job_role" defaultValue={user.job_role ?? ''} placeholder="Senior Product Manager" />
        </div>

        <div className="settings-field">
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            name="bio"
            defaultValue={user.bio ?? ''}
            placeholder="Tell us a bit about yourself…"
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="settings-field">
          <label htmlFor="country">Country</label>
          <select id="country" name="country" defaultValue={user.country ?? ''}>
            <option value="">Select country…</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="settings-field">
          <label>
            Areas of interest{' '}
            <span className="settings-hint">({selected.length}/7 selected)</span>
          </label>
          {/* Hidden inputs carry the selected values */}
          {selected.map(a => (
            <input key={a} type="hidden" name="areas_of_interest" value={a} />
          ))}
          <div className="tags-grid">
            {AREAS.map(area => (
              <button
                key={area}
                type="button"
                onClick={() => toggleArea(area)}
                className={`tag-chip ${selected.includes(area) ? 'selected' : ''}`}
                disabled={!selected.includes(area) && selected.length >= 7}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-actions">
          <button type="submit" disabled={isPending} className="btn-save">
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
          {state.success && <span className="save-msg ok">Saved!</span>}
          {state.error && <span className="save-msg err">{state.error}</span>}
        </div>
      </form>

      {/* Password reset */}
      <div style={{
        marginTop: '2rem', paddingTop: '1.5rem',
        borderTop: '1px solid #e5e7eb',
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>
          Password
        </h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
          We&apos;ll send a reset link to <strong>{user.email}</strong>.
        </p>
        <button onClick={handleReset} className="btn-save" type="button">
          Send password reset email
        </button>
        {resetMsg && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#6b7280' }}>{resetMsg}</p>
        )}
      </div>
    </div>
  )
}
