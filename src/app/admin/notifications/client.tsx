'use client'

import { useActionState, useState } from 'react'
import { broadcastNotificationAction, type BroadcastState } from './actions'

const JOB_ROLES = ['Product Manager', 'Product Designer', 'Engineer', 'Entrepreneur', 'Researcher', 'Student', 'Other']
const COUNTRIES = ['Nigeria', 'Kenya', 'Ghana', 'South Africa', 'Ethiopia', 'Egypt', 'Rwanda', 'Uganda', 'Tanzania', 'Senegal', 'Other']
const INTERESTS = ['Growth', 'Strategy', 'Design', 'Analytics', 'AI/ML', 'B2B', 'B2C', 'Fintech', 'Healthtech', 'Edtech', 'Agritech']

const DAY_RANGES = [
  { value: 'all', label: 'All time' },
  { value: '24', label: 'Signed up in last 24 hours' },
  { value: '168', label: 'Signed up in last 7 days' },
  { value: '720', label: 'Signed up in last 30 days' },
  { value: '2160', label: 'Signed up in last 90 days' },
  { value: 'custom', label: 'Custom date range' },
]

interface PastNotification {
  id: string; title: string; body: string; channel: string;
  sent_at: string | null; created_at: string; audience_filters: Record<string, unknown> | null
}

const initState: BroadcastState = {}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function NotificationsClient({ pastNotifications }: { pastNotifications: PastNotification[] }) {
  const [state, formAction, isPending] = useActionState(broadcastNotificationAction, initState)
  const [dayRange, setDayRange] = useState('all')

  return (
    <div className="admin-main-inner" style={{ maxWidth: '720px' }}>
      <h1 style={{ margin: '0 0 0.375rem', fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-ink-deep)' }}>
        Broadcast
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', margin: '0 0 2rem' }}>
        Send in-app and/or email notifications to filtered audience segments.
      </p>

      {state.success && (
        <div style={{ background: '#dcfce7', border: '1px solid #16a34a', borderRadius: '8px', padding: '0.875rem 1rem', marginBottom: '1.25rem', color: '#15803d', fontSize: '0.875rem' }}>
          Broadcast sent! {state.sentTo != null && `Reached ${state.sentTo} members.`}
        </div>
      )}
      {state.error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', padding: '0.875rem 1rem', marginBottom: '1.25rem', color: '#b91c1c', fontSize: '0.875rem' }}>
          {state.error}
        </div>
      )}

      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '3rem' }}>

        {/* Message */}
        <Card title="Message">
          <Field label="Title">
            <input name="title" required placeholder="Notification title" style={inputStyle} maxLength={150} />
          </Field>
          <Field label="Message">
            <textarea name="message" required rows={4} placeholder="Notification body…" style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} maxLength={1000} />
          </Field>
          <Field label="Channel">
            <select name="channel" style={inputStyle} defaultValue="in_app">
              <option value="in_app">In-app only</option>
              <option value="email">Email only</option>
              <option value="both">Both (in-app + email)</option>
            </select>
          </Field>
        </Card>

        {/* Audience filters */}
        <Card title="Audience filters" hint="All optional — leave blank to target every member">
          <Field label="Job role">
            <select name="job_roles" multiple style={{ ...inputStyle, height: '7rem' }}>
              {JOB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span style={hintStyle}>Hold Cmd/Ctrl to select multiple</span>
          </Field>
          <Field label="Country">
            <select name="countries" multiple style={{ ...inputStyle, height: '7rem' }}>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span style={hintStyle}>Hold Cmd/Ctrl to select multiple</span>
          </Field>
          <Field label="Interest area">
            <select name="interests" multiple style={{ ...inputStyle, height: '6rem' }}>
              {INTERESTS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <span style={hintStyle}>Hold Cmd/Ctrl to select multiple</span>
          </Field>
          <Field label="Sign-up date range">
            <select
              name="day_range"
              style={inputStyle}
              value={dayRange}
              onChange={e => setDayRange(e.target.value)}
            >
              {DAY_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
          {dayRange === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Signed up after">
                <input type="date" name="signup_after" style={inputStyle} />
              </Field>
              <Field label="Signed up before">
                <input type="date" name="signup_before" style={inputStyle} />
              </Field>
            </div>
          )}
        </Card>

        <button type="submit" disabled={isPending} style={{ alignSelf: 'flex-start', padding: '0.625rem 1.75rem', background: 'var(--color-ink-deep)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9375rem', fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1 }}>
          {isPending ? 'Sending…' : 'Send broadcast'}
        </button>
      </form>

      {/* Past broadcasts */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-ink-deep)', margin: '0 0 1rem' }}>
          Previous broadcasts
        </h2>
        {pastNotifications.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No broadcasts sent yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {pastNotifications.map(n => (
              <div key={n.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.375rem' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#111827', margin: 0 }}>{n.title}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <ChannelBadge channel={n.channel} />
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{timeAgo(n.sent_at ?? n.created_at)}</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0, lineHeight: 1.5, maxHeight: '2.5rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827', margin: 0 }}>{title}</h2>
        {hint && <p style={{ fontSize: '0.8125rem', color: '#9ca3af', margin: '0.125rem 0 0' }}>{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>{label}</label>
      {children}
    </div>
  )
}

function ChannelBadge({ channel }: { channel: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    in_app: { bg: '#dbeafe', text: '#1d4ed8', label: 'In-app' },
    email:  { bg: '#fef3c7', text: '#92400e', label: 'Email' },
    both:   { bg: '#dcfce7', text: '#15803d', label: 'Both' },
  }
  const s = map[channel] ?? { bg: '#f3f4f6', text: '#374151', label: channel }
  return <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: s.bg, color: s.text, padding: '0.1rem 0.4rem', borderRadius: '0.2rem' }}>{s.label}</span>
}

const inputStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9375rem', outline: 'none', width: '100%', boxSizing: 'border-box' }
const hintStyle: React.CSSProperties = { fontSize: '0.75rem', color: '#9ca3af' }
