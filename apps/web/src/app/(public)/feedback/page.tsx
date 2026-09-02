'use client'

import Link from 'next/link'
import { useState } from 'react'

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_suggestion', label: 'Feature suggestion' },
  { value: 'content_request', label: 'Content request' },
  { value: 'something_confusing', label: 'Something confusing' },
  { value: 'something_liked', label: 'Something I liked' },
  { value: 'account_support', label: 'Account / support issue' },
  { value: 'other', label: 'Other' },
]

// Epic G §G.10 — replaces the earlier Support Inbox / Content Request
// split with one "Give Feedback" entry point. Contact Us (apps/web
// (public)/contact) stays separate for general external communication,
// per JT's explicit instruction.
export default function FeedbackPage() {
  const [category, setCategory] = useState('bug')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) { setError('Please describe what happened.'); return }
    setError(null)
    setIsPending(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message, url: window.location.href }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to submit.')
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsPending(false)
    }
  }

  if (submitted) {
    return (
      <div className="auth-page">
        <header className="auth-header"><Link href="/" className="auth-brand">Product Slice HQ</Link></header>
        <main className="auth-main">
          <div className="auth-card">
            <div className="auth-card-inner" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <h1 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.75rem' }}>Thanks for the feedback</h1>
              <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                We read every submission. If it needs a reply, we'll reach you at your account email.
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
      <header className="auth-header" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        <Link href="/" className="text-label-sm" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', justifySelf: 'start' }}>← Back</Link>
        <Link href="/" className="auth-brand" style={{ justifySelf: 'center' }}>Product Slice HQ</Link>
        <span />
      </header>

      <main className="auth-main">
        <div className="auth-card" style={{ maxWidth: '560px' }}>
          <div className="auth-card-inner">
            <div style={{ marginBottom: '1.75rem' }}>
              <h1 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>Give feedback</h1>
              <p className="text-body-md" style={{ color: 'var(--color-text-muted)' }}>
                Found a bug, have an idea, or something confused you? Tell us here.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label htmlFor="category">Category</label>
                <select id="category" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor="message">What's on your mind?</label>
                <textarea
                  id="message" required rows={5} maxLength={4000}
                  value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us what happened, or what you'd like to see…"
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {error && <p className="auth-error" role="alert">{error}</p>}

              <button type="submit" disabled={isPending} className="auth-submit">
                {isPending ? 'Sending…' : 'SEND FEEDBACK →'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
