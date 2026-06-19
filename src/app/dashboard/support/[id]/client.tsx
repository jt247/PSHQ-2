'use client'

import { useActionState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { postUserReplyAction, type ReplyState } from '../actions'

interface Reply {
  id: string
  body: string
  image_url: string | null
  is_internal: boolean
  created_at: string
  user: { full_name: string | null; email: string; role: string } | null
}

export interface Ticket {
  id: string
  ticket_number: number
  subject: string
  description: string | null
  status: string
  priority: string
  created_at: string
  replies: Reply[]
}

const initState: ReplyState = {}

const STATUS_COLOR: Record<string, string> = {
  open: '#1d4ed8', in_progress: '#c2410c', resolved: '#15803d', closed: '#6b7280',
}

export function TicketDetailClient({ ticket, isOwner }: { ticket: Ticket; isOwner: boolean }) {
  const boundAction = postUserReplyAction.bind(null, ticket.id)
  const [state, formAction, isPending] = useActionState(boundAction, initState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  const statusColor = STATUS_COLOR[ticket.status] ?? '#374151'

  return (
    <div style={page}>
      <Link href="/dashboard/support" style={back}>← Back to tickets</Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.8125rem', color: '#9ca3af' }}>
            Ticket #{ticket.ticket_number}
          </p>
          <h1 style={h1}>{ticket.subject}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ ...badge, background: `${statusColor}18`, color: statusColor }}>
            {ticket.status.replace('_', ' ')}
          </span>
          <span style={{ ...badge, background: '#f3f4f6', color: '#374151' }}>{ticket.priority}</span>
        </div>
      </div>

      {ticket.description && (
        <div style={{ ...bubble, background: '#f9fafb', marginBottom: '1rem' }}>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.8125rem', color: '#9ca3af' }}>
            Original message · {new Date(ticket.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.6 }}>{ticket.description}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {ticket.replies.map(r => {
          const isAdmin = r.user?.role === 'admin' || r.user?.role === 'super_admin'
          const name = r.user?.full_name || r.user?.email?.split('@')[0] || (isAdmin ? 'Support' : 'You')
          return (
            <div key={r.id} style={{ ...bubble, background: isAdmin ? '#eef2ff' : '#fff', marginLeft: isAdmin ? 0 : 'auto', maxWidth: '90%' }}>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.8125rem', color: isAdmin ? '#4f46e5' : '#9ca3af', fontWeight: isAdmin ? 600 : 400 }}>
                {name} · {new Date(r.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
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

      {isOwner && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
        <form ref={formRef} action={formAction} style={formStyle} encType="multipart/form-data">
          <textarea
            name="body" required rows={3}
            placeholder="Reply to support…"
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.8125rem', color: '#6b7280', cursor: 'pointer' }}>
              Attach image
              <input type="file" name="image" accept="image/jpeg,image/png" style={{ display: 'none' }} />
            </label>
            <button type="submit" disabled={isPending} style={btn}>
              {isPending ? 'Sending…' : 'Send reply'}
            </button>
            {state.error && <span style={{ color: '#b91c1c', fontSize: '0.8125rem' }}>{state.error}</span>}
            {state.success && <span style={{ color: '#15803d', fontSize: '0.8125rem' }}>Reply sent!</span>}
          </div>
        </form>
      )}
    </div>
  )
}

const page: React.CSSProperties = { maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif' }
const back: React.CSSProperties = { fontSize: '0.8125rem', color: '#6b7280', textDecoration: 'none', display: 'block', marginBottom: '1rem' }
const h1: React.CSSProperties = { fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }
const badge: React.CSSProperties = { display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' as const }
const bubble: React.CSSProperties = { padding: '0.875rem 1rem', border: '1px solid #e5e7eb', borderRadius: '10px' }
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.75rem' }
const inputStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9375rem', outline: 'none', width: '100%', boxSizing: 'border-box' }
const btn: React.CSSProperties = { padding: '0.5rem 1.25rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }
