'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { createServiceContactAction, type ContactState } from './actions'

const initState: ContactState = {}

export default function ContactPage() {
  const [state, formAction, isPending] = useActionState(createServiceContactAction, initState)

  if (state.success) {
    return (
      <div className="auth-page">
        <header className="auth-header">
          <Link href="/" className="auth-brand">Product Slice HQ</Link>
        </header>
        <main className="auth-main">
          <div className="auth-card">
            <div className="auth-card-inner" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <div style={{
                width: '48px', height: '48px',
                background: 'color-mix(in srgb, var(--color-accent-warm) 25%, transparent)',
                borderRadius: '50%', margin: '0 auto 1.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem',
              }}>✓</div>
              <h1 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.75rem' }}>Message received</h1>
              <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                Your ticket #{state.ticketNumber} has been created. We&apos;ll respond within 24–48 hours.
              </p>
              <Link href="/" className="btn-primary">Back to home</Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link href="/" className="auth-brand">Product Slice HQ</Link>
      </header>

      <main className="auth-main">
        <div className="auth-card" style={{ maxWidth: '560px' }}>
          <div className="auth-card-inner">
            <div style={{ marginBottom: '1.75rem' }}>
              <h1 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>
                Get in touch
              </h1>
              <p className="text-body-md" style={{ color: 'var(--color-text-muted)' }}>
                Have a question or feedback? We&apos;ll get back to you within 24–48 hours.
              </p>
            </div>

            <form action={formAction} className="auth-form">
              <div className="auth-field">
                <label htmlFor="name">Your name</label>
                <input id="name" name="name" required placeholder="Ada Lovelace" />
              </div>
              <div className="auth-field">
                <label htmlFor="email">Email address</label>
                <input id="email" name="email" type="email" required placeholder="ada@example.com" />
              </div>
              <div className="auth-field">
                <label htmlFor="subject">Subject</label>
                <input id="subject" name="subject" required placeholder="What can we help with?" maxLength={200} />
              </div>
              <div className="auth-field">
                <label htmlFor="description">Message</label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={5}
                  placeholder="Tell us what's on your mind…"
                  maxLength={3000}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {state.error && (
                <p className="auth-error" role="alert">{state.error}</p>
              )}

              <button type="submit" disabled={isPending} className="auth-submit">
                {isPending ? 'Sending…' : 'SEND MESSAGE →'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
