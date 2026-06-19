'use client'

import { useActionState } from 'react'
import { resetPasswordAction, type ResetPasswordState } from '../actions/auth'

const initial: ResetPasswordState = { error: null, success: false }

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(resetPasswordAction, initial)

  return (
    <div className="auth-container">
      <h1>Set a new password</h1>

      <form action={action} className="auth-form">
        <div className="auth-field">
          <label htmlFor="password">New password <span className="auth-hint">(min 8 characters)</span></label>
          <input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
        </div>

        <div className="auth-field">
          <label htmlFor="confirm_password">Confirm password</label>
          <input id="confirm_password" name="confirm_password" type="password" required autoComplete="new-password" minLength={8} />
        </div>

        {state.error && <p className="auth-error" role="alert">{state.error}</p>}

        <button type="submit" disabled={pending} className="auth-submit">
          {pending ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
