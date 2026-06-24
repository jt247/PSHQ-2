'use client'

import { useState, useActionState } from 'react'
import Link from 'next/link'
import { createTicketAction, type CreateTicketState } from './actions'

interface TicketRow {
  id: string; ticket_number: number; subject: string; status: string; priority: string;
  created_at: string; updated_at: string; email: string | null;
  user: { full_name: string | null; email: string } | null
}

interface Props {
  rows: TicketRow[]
  currentStatus?: string
  currentType?: string
  statusColors: Record<string, string>
}

const STATUSES = ['open', 'in_progress', 'resolved', 'closed']

const PRIORITY_STYLE: Record<string, { bg: string; text: string }> = {
  low:    { bg: '#f0fdf4', text: '#15803d' },
  medium: { bg: '#fef9c3', text: '#a16207' },
  high:   { bg: '#ffedd5', text: '#c2410c' },
  urgent: { bg: '#fee2e2', text: '#b91c1c' },
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildHref(params: Record<string, string | undefined>) {
  const q = Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&')
  return q ? `?${q}` : '/admin/support'
}

function CreateSlideOver({ onClose }: { onClose: () => void }) {
  const initState: CreateTicketState = {}
  const [state, formAction, isPending] = useActionState(createTicketAction, initState)

  if (state.success) {
    return (
      <SlideOver onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>Ticket created</p>
          <p style={{ color: '#6b7280', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>The inquiry has been logged successfully.</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            {state.id && (
              <Link href={`/admin/support/${state.id}`} style={btnPrimary}>View ticket</Link>
            )}
            <button onClick={onClose} style={btnSecondary}>Close</button>
          </div>
        </div>
      </SlideOver>
    )
  }

  return (
    <SlideOver onClose={onClose}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-ink-deep)', margin: '0 0 0.25rem' }}>New contact inquiry</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: '0 0 1.5rem' }}>Log an inquiry from someone who reached out outside the platform.</p>

      {state.error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#b91c1c', fontSize: '0.875rem' }}>
          {state.error}
        </div>
      )}

      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Name</label>
          <input name="name" placeholder="Contact name" style={inputStyle} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Email *</label>
          <input name="email" type="email" required placeholder="contact@example.com" style={inputStyle} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Subject *</label>
          <input name="subject" required placeholder="What is this about?" style={inputStyle} maxLength={200} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Message *</label>
          <textarea name="description" required rows={5} placeholder="Describe the inquiry or message…" style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} maxLength={2000} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Priority</label>
          <select name="priority" style={inputStyle} defaultValue="medium">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="submit" disabled={isPending} style={{ ...btnPrimary, opacity: isPending ? 0.7 : 1 }}>
            {isPending ? 'Creating…' : 'Create inquiry'}
          </button>
          <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
        </div>
      </form>
    </SlideOver>
  )
}

function SlideOver({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div style={{ width: '460px', maxWidth: '95vw', height: '100%', background: '#fff', overflowY: 'auto', padding: '2rem 1.75rem', boxShadow: '-4px 0 32px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#9ca3af', padding: 0, marginBottom: '1rem' }}>✕</button>
        {children}
      </div>
    </div>
  )
}

export function SupportClient({ rows, currentStatus, currentType, statusColors }: Props) {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="admin-main-inner">
      {showCreate && <CreateSlideOver onClose={() => setShowCreate(false)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-accent-warm)', marginBottom: '0.25rem' }}>
            Tactical Operations Center
          </p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-ink-deep)', margin: 0 }}>
            Support
          </h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + New inquiry
        </button>
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <a href={buildHref({ status: currentStatus })} style={typePill(!currentType)}>All</a>
        <a href={buildHref({ type: 'member', status: currentStatus })} style={typePill(currentType === 'member')}>
          Member tickets
        </a>
        <a href={buildHref({ type: 'contact', status: currentStatus })} style={typePill(currentType === 'contact')}>
          Contact inquiries
        </a>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <a href={buildHref({ type: currentType })} style={statusPill(!currentStatus)}>All status</a>
        {STATUSES.map(s => (
          <a key={s} href={buildHref({ status: s, type: currentType })} style={statusPill(currentStatus === s)}>
            {s.replace('_', ' ')}
          </a>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              {['#', 'Source', 'Contact', 'Subject', 'Status', 'Priority', 'Updated'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(t => {
              const isMember = t.user !== null
              const color = statusColors[t.status] ?? '#374151'
              const pri = PRIORITY_STYLE[t.priority] ?? { bg: '#f3f4f6', text: '#374151' }
              const displayName = t.user?.full_name ?? t.email ?? '—'
              const displayEmail = t.user?.email ?? t.email ?? '—'

              return (
                <tr key={t.id}>
                  <td style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>#{t.ticket_number}</td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '0.2rem',
                      fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                      background: isMember ? '#dbeafe' : '#f3f4f6',
                      color: isMember ? '#1d4ed8' : '#374151',
                    }}>
                      {isMember ? 'Member' : 'Contact'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{displayName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{displayEmail}</div>
                  </td>
                  <td>
                    <Link href={`/admin/support/${t.id}`} style={{ color: '#111827', fontWeight: 500, textDecoration: 'none' }}>
                      {t.subject}
                    </Link>
                  </td>
                  <td>
                    <span style={{ display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', background: `${color}18`, color }}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', background: pri.bg, color: pri.text }}>
                      {t.priority}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>{timeAgo(t.updated_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No tickets found.</div>
        )}
      </div>
    </div>
  )
}

const typePill = (active: boolean): React.CSSProperties => ({
  padding: '0.3rem 0.875rem', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 600,
  textDecoration: 'none', background: active ? 'var(--color-ink-deep)' : 'transparent',
  color: active ? '#fff' : 'var(--color-text-muted)',
  border: `1px solid ${active ? 'transparent' : 'color-mix(in srgb, var(--color-tertiary) 15%, transparent)'}`,
})
const statusPill = (active: boolean): React.CSSProperties => ({
  padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500,
  textDecoration: 'none', textTransform: 'capitalize',
  background: active ? '#374151' : '#f3f4f6', color: active ? '#fff' : '#374151',
})
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.375rem' }
const labelStyle: React.CSSProperties = { fontSize: '0.875rem', fontWeight: 500, color: '#374151' }
const inputStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9375rem', outline: 'none', width: '100%', boxSizing: 'border-box' }
const btnPrimary: React.CSSProperties = { padding: '0.5rem 1.25rem', background: 'var(--color-ink-deep)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
const btnSecondary: React.CSSProperties = { padding: '0.5rem 1.25rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }
