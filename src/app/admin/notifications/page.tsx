'use client'

import { useActionState } from 'react'
import { broadcastNotificationAction, type BroadcastState } from './actions'

const JOB_ROLES = ['Product Manager', 'Product Designer', 'Engineer', 'Entrepreneur', 'Researcher', 'Student', 'Other']
const COUNTRIES = ['Nigeria', 'Kenya', 'Ghana', 'South Africa', 'Ethiopia', 'Egypt', 'Rwanda', 'Uganda', 'Tanzania', 'Senegal', 'Other']
const INTERESTS = ['Growth', 'Strategy', 'Design', 'Analytics', 'AI/ML', 'B2B', 'B2C', 'Fintech', 'Healthtech', 'Edtech', 'Agritech']

const initState: BroadcastState = {}

export default function NotificationsPage() {
  const [state, formAction, isPending] = useActionState(broadcastNotificationAction, initState)

  return (
    <div className="admin-main-inner" style={{ maxWidth: '680px' }}>
      <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Broadcast notification</h1>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
        Send in-app and/or email notifications to filtered audience segments.
      </p>

      {state.success && (
        <div style={{ background: '#dcfce7', border: '1px solid #16a34a', borderRadius: '8px', padding: '0.875rem 1rem', marginBottom: '1.25rem', color: '#15803d', fontSize: '0.875rem' }}>
          Broadcast sent! {state.sentTo != null && `Reached ${state.sentTo} users.`}
        </div>
      )}
      {state.error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', padding: '0.875rem 1rem', marginBottom: '1.25rem', color: '#b91c1c', fontSize: '0.875rem' }}>
          {state.error}
        </div>
      )}

      <form action={formAction} style={formStyle}>
        <section style={sectionStyle}>
          <h2 style={sectionHead}>Message</h2>
          <div style={field}>
            <label style={label}>Title</label>
            <input name="title" required placeholder="Notification title" style={input} maxLength={150} />
          </div>
          <div style={field}>
            <label style={label}>Message</label>
            <textarea name="message" required rows={4} placeholder="Notification body…" style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} maxLength={1000} />
          </div>
          <div style={field}>
            <label style={label}>Channel</label>
            <select name="channel" style={input} defaultValue="in_app">
              <option value="in_app">In-app only</option>
              <option value="email">Email only</option>
              <option value="both">Both</option>
            </select>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHead}>Audience filters <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.8125rem' }}>(all optional — leave blank to target everyone)</span></h2>

          <div style={field}>
            <label style={label}>Job roles</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {JOB_ROLES.map(r => (
                <label key={r} style={chip}>
                  <input type="checkbox" name="job_roles" value={r} style={{ marginRight: '0.25rem' }} />{r}
                </label>
              ))}
            </div>
          </div>

          <div style={field}>
            <label style={label}>Countries</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {COUNTRIES.map(c => (
                <label key={c} style={chip}>
                  <input type="checkbox" name="countries" value={c} style={{ marginRight: '0.25rem' }} />{c}
                </label>
              ))}
            </div>
          </div>

          <div style={field}>
            <label style={label}>Interests</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {INTERESTS.map(i => (
                <label key={i} style={chip}>
                  <input type="checkbox" name="interests" value={i} style={{ marginRight: '0.25rem' }} />{i}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={field}>
              <label style={label}>Purchase status</label>
              <select name="purchase_status" style={input}>
                <option value="">Any</option>
                <option value="has_purchased">Has purchased</option>
                <option value="no_purchase">No purchase</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={field}>
              <label style={label}>Signed up after</label>
              <input type="date" name="signup_after" style={input} />
            </div>
            <div style={field}>
              <label style={label}>Signed up before</label>
              <input type="date" name="signup_before" style={input} />
            </div>
          </div>
        </section>

        <button type="submit" disabled={isPending} style={btn}>
          {isPending ? 'Sending broadcast…' : 'Send broadcast'}
        </button>
      </form>
    </div>
  )
}

const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1.25rem' }
const sectionStyle: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }
const sectionHead: React.CSSProperties = { fontSize: '0.9375rem', fontWeight: 600, color: '#111827', margin: 0 }
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.375rem' }
const label: React.CSSProperties = { fontSize: '0.875rem', fontWeight: 500, color: '#374151' }
const input: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9375rem', outline: 'none', width: '100%', boxSizing: 'border-box' }
const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.625rem', border: '1px solid #e5e7eb', borderRadius: '9999px', fontSize: '0.8125rem', cursor: 'pointer', background: '#f9fafb', color: '#374151' }
const btn: React.CSSProperties = { padding: '0.625rem 1.5rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' }
