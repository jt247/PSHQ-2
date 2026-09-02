'use client'

import { useState, useActionState, useTransition } from 'react'
import Link from 'next/link'
import { createTicketAction, type CreateTicketState, updateFeedbackStatusAction, updateContentRequestStatusAction } from './actions'

export interface UnifiedRow {
  id: string
  source: 'support' | 'content_request' | 'feedback'
  title: string
  category: string | null
  status: string
  contactName: string
  contactEmail: string | null
  created_at: string
  updated_at: string
  detailHref: string | null
}

interface Props {
  rows: UnifiedRow[]
  currentStatus?: string
  currentSource?: string
  currentCategory?: string
  openCount: number
}

const DISPLAY_STATUSES = ['new', 'reviewing', 'planned', 'in_progress', 'resolved', 'closed']
const SOURCE_LABEL: Record<string, string> = { support: 'Support ticket', content_request: 'Content request', feedback: 'Feedback' }
const SOURCE_COLOR: Record<string, string> = { support: '#dbeafe', content_request: '#f3e8ff', feedback: '#dcfce7' }
const STATUS_COLOR: Record<string, string> = { new: '#1d4ed8', reviewing: '#a16207', planned: '#7c3aed', in_progress: '#c2410c', resolved: '#15803d', closed: '#6b7280' }

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildHref(params: Record<string, string | undefined>) {
  const q = Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&')
  return q ? `?${q}` : '/support'
}

function StatusSelect({ row }: { row: UnifiedRow }) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(row.status)

  if (row.source === 'support') {
    // Ticket status changes happen on its own detail page (real reply
    // thread lives there) — link through instead of duplicating the flow.
    return (
      <span style={{ display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', background: `${STATUS_COLOR[status]}18`, color: STATUS_COLOR[status] }}>
        {status.replace('_', ' ')}
      </span>
    )
  }

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={e => {
        const next = e.target.value
        setStatus(next)
        startTransition(() => row.source === 'feedback' ? updateFeedbackStatusAction(row.id, next) : updateContentRequestStatusAction(row.id, next))
      }}
      style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', border: '1px solid #d1d5db', color: STATUS_COLOR[status], fontWeight: 600 }}
    >
      {DISPLAY_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
    </select>
  )
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
            {state.id && <Link href={`/support/${state.id}`} style={btnPrimary}>View ticket</Link>}
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

export function SupportClient({ rows, currentStatus, currentSource, currentCategory, openCount }: Props) {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="admin-main-inner">
      {showCreate && <CreateSlideOver onClose={() => setShowCreate(false)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-accent-warm)', marginBottom: '0.25rem' }}>
            Tactical Operations Center
          </p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-ink-deep)', margin: 0 }}>
            Support & Feedback
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#9ca3af', margin: '0.25rem 0 0' }}>{openCount} open across all sources</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ New inquiry</button>
      </div>

      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <a href={buildHref({ status: currentStatus, category: currentCategory })} style={typePill(!currentSource)}>All sources</a>
        {(['support', 'content_request', 'feedback'] as const).map(s => (
          <a key={s} href={buildHref({ source: s, status: currentStatus, category: currentCategory })} style={typePill(currentSource === s)}>{SOURCE_LABEL[s]}</a>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <a href={buildHref({ source: currentSource, category: currentCategory })} style={statusPill(!currentStatus)}>All status</a>
        {DISPLAY_STATUSES.map(s => (
          <a key={s} href={buildHref({ status: s, source: currentSource, category: currentCategory })} style={statusPill(currentStatus === s)}>{s.replace('_', ' ')}</a>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>{['Source', 'Contact', 'Subject / Message', 'Status', 'Updated'].map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={`${r.source}-${r.id}`}>
                <td>
                  <span style={{ display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '0.2rem', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: SOURCE_COLOR[r.source], color: '#374151' }}>
                    {SOURCE_LABEL[r.source]}{r.category ? ` · ${r.category.replace(/_/g, ' ')}` : ''}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{r.contactName}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{r.contactEmail ?? '—'}</div>
                </td>
                <td>
                  {r.detailHref ? (
                    <Link href={r.detailHref} style={{ color: '#111827', fontWeight: 500, textDecoration: 'none' }}>{r.title}</Link>
                  ) : (
                    <span style={{ color: '#111827' }}>{r.title}</span>
                  )}
                </td>
                <td><StatusSelect row={r} /></td>
                <td style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>{timeAgo(r.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Nothing here.</div>}
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
