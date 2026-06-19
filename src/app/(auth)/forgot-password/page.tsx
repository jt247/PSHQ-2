'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { forgotPasswordAction, type ForgotPasswordState } from '../actions/auth'

const initial: ForgotPasswordState = { error: null, success: false }

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial)

  if (state.success) {
    return (
      <div className="auth-container">
        <h1>Check your email</h1>
        <p>If an account exists for that address, we sent a password reset link.</p>
        <Link href="/sign-in">Back to sign in</Link>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <h1>Reset your password</h1>
      <p>Enter your email and we&apos;ll send you a reset link.</p>

      <form action={action} className="auth-form">
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>

        {state.error && <p className="auth-error" role="alert">{state.error}</p>}

        <button type="submit" disabled={pending} className="auth-submit">
          {pending ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="auth-footer">
        <Link href="/sign-in">Back to sign in</Link>
      </p>
    </div>
  )
}
