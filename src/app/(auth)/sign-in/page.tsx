'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useActionState } from 'react'
import { signInAction, type SignInState } from '../actions/auth'
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton'

const initial: SignInState = { error: null }

function SignInForm() {
  const [state, action, pending] = useActionState(signInAction, initial)
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')

  return (
    <>
      {urlError === 'auth_failed' && (
        <p className="auth-error" role="alert">Authentication failed. Please try again.</p>
      )}

      <form action={action} className="auth-form">
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>

        <div className="auth-field">
          <label htmlFor="password">
            Password
            <Link href="/forgot-password" className="auth-forgot">Forgot password?</Link>
          </label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>

        {state.error && <p className="auth-error" role="alert">{state.error}</p>}

        <button type="submit" disabled={pending} className="auth-submit">
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </>
  )
}

export default function SignInPage() {
  return (
    <div className="auth-container">
      <h1>Sign in</h1>

      <GoogleOAuthButton label="Sign in with Google" />

      <div className="auth-divider"><span>or</span></div>

      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>

      <p className="auth-footer">
        Don&apos;t have an account? <Link href="/sign-up">Sign up</Link>
      </p>
    </div>
  )
}
