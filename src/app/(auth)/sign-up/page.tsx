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
      <div className="auth-container">
        <h1>Check your email</h1>
        <p>We sent a confirmation link to your inbox. Click it to activate your account.</p>
        <Link href="/sign-in">Back to sign in</Link>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <h1>Create your account</h1>

      {inviteToken && (
        <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#15803d' }}>
          You&apos;ve been invited to join the PSHQ admin team. Complete your account below.
        </div>
      )}

      {!inviteToken && <GoogleOAuthButton label="Sign up with Google" />}
      {!inviteToken && <div className="auth-divider"><span>or</span></div>}

      <form action={action} className="auth-form">
        {/* Hidden invite token — consumed in the server action */}
        <input type="hidden" name="invite_token" value={inviteToken} />

        <div className="auth-row">
          <div className="auth-field">
            <label htmlFor="first_name">First name</label>
            <input id="first_name" name="first_name" type="text" required autoComplete="given-name" />
          </div>
          <div className="auth-field">
            <label htmlFor="last_name">Last name</label>
            <input id="last_name" name="last_name" type="text" required autoComplete="family-name" />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>

        <div className="auth-field">
          <label htmlFor="password">Password <span className="auth-hint">(min 8 characters)</span></label>
          <input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
        </div>

        {state.error && <p className="auth-error" role="alert">{state.error}</p>}

        <button type="submit" disabled={pending} className="auth-submit">
          {pending ? 'Creating account…' : inviteToken ? 'Create admin account' : 'Create account'}
        </button>
      </form>

      {!inviteToken && (
        <p className="auth-footer">
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      )}
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="auth-container"><p>Loading…</p></div>}>
      <SignUpForm />
    </Suspense>
  )
}
