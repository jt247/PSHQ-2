import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import type { Session } from '@supabase/supabase-js'
import { trackPushNotificationOpened } from '@pshq/analytics'
import { supabase } from './supabase'
import { registerForPushNotifications, addNotificationOpenedListener, setupNotificationHandler } from './push-notifications'

WebBrowser.maybeCompleteAuthSession()

interface AuthContextValue {
  session: Session | null
  loading: boolean
  onboardingDone: boolean
  /** True until the *profile* (onboarding_done) fetch resolves for the current
   * session — distinct from `loading`, which only covers the initial session
   * check. Route guards must wait on this too, or an already-onboarded user
   * flashes through /onboarding for a frame while onboardingDone's stale
   * default (false) is still showing. */
  profileLoading: boolean
  refreshProfile: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithPassword: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboardingDone, setOnboardingDone] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)

  async function refreshProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setOnboardingDone(false); setProfileLoading(false); return }
    setProfileLoading(true)
    const { data } = await supabase.from('users').select('onboarding_done').eq('id', user.id).single()
    setOnboardingDone((data as { onboarding_done?: boolean } | null)?.onboarding_done ?? false)
    setProfileLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (cancelled) return
      if (session) await refreshProfile()
      else { setOnboardingDone(false); setProfileLoading(false) }
    }
    void run()
    return () => { cancelled = true }
    // Deliberately session?.user.id, not session — a token refresh swaps
    // the whole session object without changing the user, and re-running
    // this profile fetch on every refresh would be wasted work, not a bug.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id])

  // Sets the foreground notification display handler once. push-notifications.ts
  // only ever touches `expo-notifications` via a dynamic import gated on
  // isExpoGoAndroid() — see that file's comment for why: a plain static
  // import of the module crashes the whole app on that one platform+client
  // combination (confirmed by reading the actual installed package source).
  useEffect(() => {
    setupNotificationHandler()
  }, [])

  // Epic I §I.6 — register this device's push token once per signed-in
  // session. Fire-and-forget: registerForPushNotifications already
  // swallows its own errors (permission denied, simulator, network).
  useEffect(() => {
    if (session?.user.id) registerForPushNotifications(supabase, session.user.id)
  }, [session?.user.id])

  // Tapping a delivered push notification opens the app here — record it
  // regardless of which screen the tap lands on (deep-linking into the
  // specific content is a future refinement, not required for the event
  // to fire correctly).
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    addNotificationOpenedListener(category => {
      if (session?.user.id) {
        trackPushNotificationOpened({ supabase, source: 'mobile', userId: session.user.id }, { metadata: { category } })
      }
    }).then(unsub => { if (!cancelled) unsubscribe = unsub; else unsub() })
    return () => { cancelled = true; unsubscribe?.() }
  }, [session?.user.id])

  async function signInWithPassword(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signUpWithPassword(email: string, password: string, firstName: string, lastName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, full_name: `${firstName} ${lastName}`, auth_provider: 'email' },
      },
    })
    return { error: error?.message ?? null }
  }

  // Native OAuth: open the browser to Supabase's Google flow, redirect back
  // into the app via its own URL scheme (see app.json's "scheme"), then
  // hand the returned code to Supabase to complete the session — same
  // provider config as web (Supabase brokers Google either way), different
  // transport because there's no cookie-based redirect on a native app.
  async function signInWithGoogle() {
    const redirectTo = Linking.createURL('auth/callback')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    })
    if (error || !data.url) return { error: error?.message ?? 'Could not start Google sign-in.' }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    if (result.type !== 'success' || !result.url) return { error: null } // user cancelled — not a real error

    const url = new URL(result.url)
    const code = url.searchParams.get('code')
    if (!code) return { error: 'Google sign-in did not return a valid session.' }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    return { error: exchangeError?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, loading, onboardingDone, profileLoading, refreshProfile, signInWithPassword, signUpWithPassword, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
