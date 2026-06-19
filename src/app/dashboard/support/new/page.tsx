'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { createTicketAction, type TicketState } from '../actions'

const initState: TicketState = {}

export default function NewTicketPage() {
  const [state, formAction, isPending] = useActionState(createTicketAction, initState)
  const router = useRouter()

  useEffect(() => {
    if (state.ticketId) router.push(`/dashboard/support/${state.ticketId}`)
  }, [state.ticketId, router])

  return (
    <div style={page}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/dashboard/support" style={backLink}>← Back to tickets</Link>
        <h1 style={h1}>Submit a support ticket</h1>
      </div>

      <form action={formAction} style={form}>
        <div style={field}>
          <label style={label}>Subject</label>
          <input name="subject" required placeholder="Brief description of the issue" style={input} maxLength={200} />
        </div>

        <div style={field}>
          <label style={label}>Message</label>
          <textarea
            name="description" required rows={6}
            placeholder="Please describe the issue in detail…"
            style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }}
            maxLength={5000}
          />
        </div>

        <div style={field}>
          <label style={label}>
            Related content <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional — paste content ID)</span>
          </label>
          <input name="content_id" placeholder="UUID of the content item" style={input} />
        </div>

        {state.error && <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: 0 }}>{state.error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button type="submit" disabled={isPending} style={btnPrimary}>
            {isPending ? 'Submitting…' : 'Submit ticket'}
          </button>
          <Link href="/dashboard/support" style={{ color: '#6b7280', fontSize: '0.875rem' }}>Cancel</Link>
        </div>
      </form>
    </div>
  )
}

const page: React.CSSProperties = { maxWidth: '640px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif' }
const h1: React.CSSProperties   = { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }
const backLink: React.CSSProperties = { fontSize: '0.8125rem', color: '#6b7280', textDecoration: 'none', display: 'block', marginBottom: '0.375rem' }
const form: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' }
const label: React.CSSProperties = { fontSize: '0.875rem', fontWeight: 500, color: '#374151' }
const input: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9375rem', outline: 'none' }
const btnPrimary: React.CSSProperties = { padding: '0.5rem 1.25rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }
