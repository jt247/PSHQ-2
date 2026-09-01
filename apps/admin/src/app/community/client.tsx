'use client'

import { useActionState } from 'react'
import { grantContributionAction, adjustScoreAction, type CommunityActionState } from './actions'

const initState: CommunityActionState = {}

const GRANTABLE_ACTIONS = [
  { value: 'case_accepted', label: 'Case contribution accepted (+20)' },
  { value: 'product_lab_attendance', label: 'Product Lab attendance (+10)' },
  { value: 'community_contribution_approved', label: 'Helpful community contribution approved (+5)' },
]

const fieldStyle: React.CSSProperties = { marginBottom: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }
const inputStyle: React.CSSProperties = { padding: '0.5rem 0.625rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }
const labelStyle: React.CSSProperties = { fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }
const buttonStyle: React.CSSProperties = { padding: '0.5rem 1rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }

export function GrantContributionForm() {
  const [state, formAction, isPending] = useActionState(grantContributionAction, initState)
  return (
    <form action={formAction}>
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="grant-email">Member email</label>
        <input style={inputStyle} id="grant-email" name="email" type="email" required placeholder="member@example.com" />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="grant-action">Action</label>
        <select style={inputStyle} id="grant-action" name="action" required>
          {GRANTABLE_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>
      <button style={{ ...buttonStyle, opacity: isPending ? 0.7 : 1 }} type="submit" disabled={isPending}>{isPending ? 'Granting…' : 'Grant'}</button>
      {state.error && <p style={{ color: '#b91c1c', fontSize: '0.8125rem', marginTop: '0.5rem' }}>{state.error}</p>}
      {state.success && <p style={{ color: '#15803d', fontSize: '0.8125rem', marginTop: '0.5rem' }}>{state.success}</p>}
    </form>
  )
}

export function AdjustScoreForm() {
  const [state, formAction, isPending] = useActionState(adjustScoreAction, initState)
  return (
    <form action={formAction}>
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="adjust-email">Member email</label>
        <input style={inputStyle} id="adjust-email" name="email" type="email" required placeholder="member@example.com" />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="adjust-delta">Point adjustment (can be negative)</label>
        <input style={inputStyle} id="adjust-delta" name="delta" type="number" required placeholder="e.g. 10 or -5" />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="adjust-note">Note (internal, why)</label>
        <input style={inputStyle} id="adjust-note" name="note" type="text" placeholder="Reason for the correction" />
      </div>
      <button style={{ ...buttonStyle, opacity: isPending ? 0.7 : 1 }} type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Adjust score'}</button>
      {state.error && <p style={{ color: '#b91c1c', fontSize: '0.8125rem', marginTop: '0.5rem' }}>{state.error}</p>}
      {state.success && <p style={{ color: '#15803d', fontSize: '0.8125rem', marginTop: '0.5rem' }}>{state.success}</p>}
    </form>
  )
}
