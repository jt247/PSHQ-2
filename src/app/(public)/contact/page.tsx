'use client'

import { useActionState } from 'react'
import { createServiceContactAction, type ContactState } from './actions'

const initState: ContactState = {}

export default function ContactPage() {
  const [state, formAction, isPending] = useActionState(createServiceContactAction, initState)

  if (state.success) {
    return (
      <div style={wrap}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✓</div>
        <h1 style={h1}>Message received</h1>
        <p style={sub}>
          Your ticket #{state.ticketNumber} has been created. We&apos;ll respond within 24–48 hours.
        </p>
        <a href="/" style={btnPrimary}>Back to home</a>
      </div>
    )
  }

  return (
    <div style={{ ...wrap, textAlign: 'left' }}>
      <h1 style={{ ...h1, textAlign: 'center' }}>Contact us</h1>
      <p style={{ ...sub, textAlign: 'center', marginBottom: '2rem' }}>
        Have a question? We&apos;ll get back to you within 24–48 hours.
      </p>

      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={field}>
          <label style={label}>Your name</label>
          <input name="name" required placeholder="Ada Lovelace" style={input} />
        </div>
        <div style={field}>
          <label style={label}>Email address</label>
          <input name="email" type="email" required placeholder="ada@example.com" style={input} />
        </div>
        <div style={field}>
          <label style={label}>Subject</label>
          <input name="subject" required placeholder="What can we help with?" style={input} maxLength={200} />
        </div>
        <div style={field}>
          <label style={label}>Message</label>
          <textarea
            name="description" required rows={5}
            placeholder="Tell us what's on your mind…"
            style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }}
            maxLength={3000}
          />
        </div>

        {state.error && (
          <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: 0 }}>{state.error}</p>
        )}

        <button type="submit" disabled={isPending} style={btnPrimary as React.CSSProperties}>
          {isPending ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </div>
  )
}

const wrap: React.CSSProperties = {
  maxWidth: '520px', margin: '4rem auto', padding: '2rem 1.5rem',
  textAlign: 'center', fontFamily: 'system-ui, sans-serif',
}
const h1: React.CSSProperties = { fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }
const sub: React.CSSProperties = { color: '#6b7280', lineHeight: 1.6, margin: 0 }
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' }
const label: React.CSSProperties = { fontSize: '0.875rem', fontWeight: 500, color: '#374151' }
const input: React.CSSProperties = {
  padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px',
  fontSize: '0.9375rem', outline: 'none',
}
const btnPrimary: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'center',
  padding: '0.625rem 1.5rem', background: '#111827', color: '#fff',
  border: 'none', borderRadius: '8px', fontSize: '0.9375rem', fontWeight: 600,
  cursor: 'pointer', textDecoration: 'none',
}
