'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signUpAction, type SignUpState } from '../actions/auth'
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton'
import { Suspense } from 'react'

const initial: SignUpState = { error: null, success: false }

function SignUpForm() {
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite') ?? ''

  const [state, action, pending] = useActionState(signUpAction, initial)

  if (state.success) {
    return (
      <div className="auth-page">
        <header className="auth-header">
          <Link href="/" className="auth-brand">Product Slice HQ</Link>
        </header>
        <main className="auth-main">
          <div className="auth-card">
            <div className="auth-card-inner" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <div style={{ width: '48px', height: '48px', background: '#dcfce7', borderRadius: '50%', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.25rem' }}>✓</span>
              </div>
              <h1 className="auth-title" style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Check your email</h1>
              <p className="auth-subtitle">We sent a confirmation link to your inbox. Click it to activate your account.</p>
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
        <div className="auth-card" style={{ maxWidth: '480px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 className="auth-title">Create your authority space.</h1>
            <p className="auth-subtitle">Synthesize your product vision in a space designed for focus.</p>
          </div>

          <div className="auth-card-inner">
            {inviteToken && (
              <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.25rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#15803d', fontFamily: 'var(--font-sans)' }}>
                You&apos;ve been invited to join the PSHQ admin team. Complete your account below.
              </div>
            )}

            {!inviteToken && <GoogleOAuthButton label="Continue with Google" />}
            {!inviteToken && <div className="auth-divider"><span>or continue with email</span></div>}

            <form action={action} className="auth-form">
              <input type="hidden" name="invite_token" value={inviteToken} />

              <div className="auth-row">
                <div className="auth-field">
                  <label htmlFor="first_name">First Name</label>
                  <input id="first_name" name="first_name" type="text" required autoComplete="given-name" placeholder="Julian" />
                </div>
                <div className="auth-field">
                  <label htmlFor="last_name">Last Name</label>
                  <input id="last_name" name="last_name" type="text" required autoComplete="family-name" placeholder="Rivera" />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="email">Email Address</label>
                <input id="email" name="email" type="email" required autoComplete="email" placeholder="name@company.com" />
              </div>

              <div className="auth-field">
                <label htmlFor="password">
                  Password
                  <span className="auth-hint">min 8 characters</span>
                </label>
                <input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} placeholder="••••••••" />
              </div>

              {state.error && <p className="auth-error" role="alert">{state.error}</p>}

              <button type="submit" disabled={pending} className="auth-submit">
                {pending ? 'Creating account…' : inviteToken ? 'Create admin account' : 'Create Account'}
              </button>
            </form>
          </div>

          {!inviteToken && (
            <p className="auth-footer" style={{ marginTop: '1.5rem' }}>
              Already have an account?{' '}
              <Link href="/sign-in">Sign in →</Link>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <header className="auth-header">
          <span className="auth-brand">Product Slice HQ</span>
        </header>
        <main className="auth-main">
          <div className="auth-card"><div className="auth-card-inner" style={{ textAlign: 'center', padding: '3rem' }}>Loading…</div></div>
        </main>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}
