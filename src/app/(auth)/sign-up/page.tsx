'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signUpAction, type SignUpState } from '../actions/auth'
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton'

const initial: SignUpState = { error: null, success: false }

export default function SignUpPage() {
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

      <GoogleOAuthButton label="Sign up with Google" />

      <div className="auth-divider"><span>or</span></div>

      <form action={action} className="auth-form">
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
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </div>
  )
}
