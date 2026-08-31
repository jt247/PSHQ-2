'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { forgotPasswordAction, type ForgotPasswordState } from '../actions/auth'

const initial: ForgotPasswordState = { error: null, success: false }

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial)

  if (state.success) {
    return (
      <div className="auth-page">
        <header className="auth-header">
          <Link href="/" className="auth-brand">Product Slice HQ</Link>
        </header>
        <main className="auth-main">
          <div className="auth-card">
            <div className="auth-card-inner" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <div style={{ width: '48px', height: '48px', background: '#dbeafe', borderRadius: '50%', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                ✉️
              </div>
              <h1 className="auth-title" style={{ fontSize: '1.75rem' }}>Check your email</h1>
              <p className="auth-subtitle" style={{ marginTop: '0.5rem' }}>
                If an account exists for that address, we sent a password reset link.
              </p>
              <Link href="/sign-in" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
                Back to sign in
              </Link>
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
        <div className="auth-card">
          <div className="auth-card-inner" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Atmospheric icon */}
            <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', opacity: 0.06, fontSize: '6rem', lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>
              🔑
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h1 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>
                Forgot your password?
              </h1>
              <p className="text-body-md" style={{ color: 'var(--color-text-muted)' }}>
                No worries. Enter your registered email and we&apos;ll send you a link to reset your access.
              </p>
            </div>

            {/* Editorial callout */}
            <div style={{ borderLeft: '3px solid var(--color-accent-warm)', paddingLeft: '1rem', marginBottom: '1.5rem', background: 'color-mix(in srgb, var(--color-paper-base) 50%, transparent)', padding: '0.75rem 1rem' }}>
              <p className="text-label-sm" style={{ fontStyle: 'italic', color: 'var(--color-ink-deep)' }}>
                &quot;Great products are built on secure foundations.&quot;
              </p>
            </div>

            <form action={action} className="auth-form">
              <div className="auth-field">
                <label htmlFor="email">Email Address</label>
                <input id="email" name="email" type="email" required autoComplete="email" placeholder="e.g. curator@productslice.com" />
              </div>

              {state.error && <p className="auth-error" role="alert">{state.error}</p>}

              <button type="submit" disabled={pending} className="auth-submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {pending ? 'Sending…' : 'SEND RESET LINK →'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <Link href="/sign-in" className="auth-forgot" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                ← Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
