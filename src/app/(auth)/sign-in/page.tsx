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
          <label htmlFor="email">Email Address</label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="name@company.com" />
        </div>

        <div className="auth-field">
          <label htmlFor="password">
            Password
            <Link href="/forgot-password" className="auth-forgot">Forgot password?</Link>
          </label>
          <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
        </div>

        {state.error && <p className="auth-error" role="alert">{state.error}</p>}

        <button type="submit" disabled={pending} className="auth-submit">
          {pending ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </>
  )
}

export default function SignInPage() {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link href="/" className="auth-brand">Product Slice HQ</Link>
      </header>

      <main className="auth-main">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 className="auth-title">Welcome back.</h1>
            <p className="auth-subtitle">Enter your credentials to continue your deep work.</p>
          </div>

          <div className="auth-card-inner">
            <GoogleOAuthButton label="Continue with Google" />

            <div className="auth-divider"><span>or continue with email</span></div>

            <Suspense fallback={null}>
              <SignInForm />
            </Suspense>
          </div>

          <p className="auth-footer" style={{ marginTop: '1.5rem' }}>
            Don&apos;t have an account?{' '}
            <Link href="/sign-up">Create your space →</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
