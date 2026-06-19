'use client'

import { useActionState, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import type { TicketStatus } from '@/types/database'
import { adminReplyAction, updateTicketAction, type AdminReplyState } from '../actions'

interface Reply {
  id: string; body: string; image_url: string | null; is_internal: boolean; created_at: string
  user: { full_name: string | null; email: string; role: string } | null
}

interface Ticket {
  id: string; ticket_number: number; subject: string; description: string | null
  status: string; priority: string; created_at: string; email: string | null; assigned_to: string | null
  user: { full_name: string | null; email: string } | null
  ticket_replies: Reply[]
}

interface Agent { id: string; full_name: string | null; email: string }

const STATUS_COLOR: Record<string, string> = {
  open: '#1d4ed8', in_progress: '#c2410c', resolved: '#15803d', closed: '#6b7280',
}

const initState: AdminReplyState = {}

export function AdminTicketClient({ ticket, agents }: { ticket: Record<string, unknown>; agents: Agent[] }) {
  const t = ticket as unknown as Ticket
  const boundAction = adminReplyAction.bind(null, t.id)
  const [state, formAction, isPending] = useActionState(boundAction, initState)
  const formRef = useRef<HTMLFormElement>(null)
  const [status, setStatus] = useState(t.status)
  const [assignedTo, setAssignedTo] = useState(t.assigned_to ?? '')

  useEffect(() => { if (state.success) formRef.current?.reset() }, [state.success])

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus)
    await updateTicketAction(t.id, { status: newStatus as TicketStatus })
  }

  async function handleAssign(agentId: string) {
    setAssignedTo(agentId)
    await updateTicketAction(t.id, { assigned_to: agentId || undefined })
  }

  const statusColor = STATUS_COLOR[status] ?? '#374151'
  const displayName = t.user?.full_name ?? t.user?.email ?? t.email ?? 'Anonymous'

  return (
    <div className="admin-main-inner" style={{ maxWidth: '760px' }}>
      <Link href="/admin/support" style={back}>← Back to tickets</Link>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.8125rem', color: '#9ca3af' }}>#{t.ticket_number} · {displayName}</p>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }}>{t.subject}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <select value={status} onChange={e => handleStatusChange(e.target.value)} style={selectStyle}>
            {['open', 'in_progress', 'resolved', 'closed'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select value={assignedTo} onChange={e => handleAssign(e.target.value)} style={selectStyle}>
            <option value="">Unassigned</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.full_name ?? a.email}</option>)}
          </select>
        </div>
      </div>

      {t.description && (
        <div style={{ ...bubble, background: '#f9fafb', marginBottom: '1rem' }}>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.8125rem', color: '#9ca3af' }}>
            Original · {new Date(t.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.6 }}>{t.description}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {t.ticket_replies.map(r => {
          const isAdmin = r.user?.role === 'admin' || r.user?.role === 'super_admin'
          const name = r.user?.full_name ?? r.user?.email?.split('@')[0] ?? 'User'
          return (
            <div key={r.id} style={{ ...bubble, background: isAdmin ? '#eef2ff' : '#fff', opacity: r.is_internal ? 0.75 : 1, borderStyle: r.is_internal ? 'dashed' : 'solid' }}>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.8125rem', color: isAdmin ? '#4f46e5' : '#9ca3af', fontWeight: isAdmin ? 600 : 400 }}>
                {name} {r.is_internal && <span style={{ color: '#9ca3af', fontWeight: 400 }}>· internal note</span>}
                {' · '}{new Date(r.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.6 }}>{r.body}</p>
              {r.image_url && (
                <a href={r.image_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '0.5rem' }}>
                  <img src={r.image_url} alt="attachment" style={{ maxWidth: '200px', borderRadius: '6px', border: '1px solid #e5e7eb' }} />
                </a>
              )}
            </div>
          )
        })}
      </div>

      <form ref={formRef} action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} encType="multipart/form-data">
        <textarea name="body" required rows={4} placeholder="Reply to user or add internal note…" style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.8125rem', color: '#6b7280', cursor: 'pointer' }}>
            Attach image
            <input type="file" name="image" accept="image/jpeg,image/png" style={{ display: 'none' }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#6b7280', cursor: 'pointer' }}>
            <input type="checkbox" name="is_internal" value="true" /> Internal note
          </label>
          <button type="submit" disabled={isPending} style={btn}>{isPending ? 'Sending…' : 'Send reply'}</button>
          {state.error && <span style={{ color: '#b91c1c', fontSize: '0.8125rem' }}>{state.error}</span>}
          {state.success && <span style={{ color: '#15803d', fontSize: '0.8125rem' }}>Sent!</span>}
        </div>
      </form>
    </div>
  )
}

const back: React.CSSProperties = { fontSize: '0.8125rem', color: '#6b7280', textDecoration: 'none', display: 'block', marginBottom: '1rem' }
const bubble: React.CSSProperties = { padding: '0.875rem 1rem', border: '1px solid #e5e7eb', borderRadius: '10px' }
const selectStyle: React.CSSProperties = { padding: '0.375rem 0.625rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8125rem', outline: 'none', background: '#fff', textTransform: 'capitalize' }
const inputStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9375rem', outline: 'none', width: '100%', boxSizing: 'border-box' }
const btn: React.CSSProperties = { padding: '0.5rem 1.25rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }
