import { redirect } from 'next/navigation'
import { createClient } from '@pshq/api-client/server'
import { isOnboarded } from '@pshq/api-client/onboarding'

// Gate for anything that needs a completed profile: templates, downloads,
// ebooks, learning paths, collections, AI personalization, case
// participation, achievements, the personalized dashboard. Articles are
// explicitly excluded from this gate (Epic A.3) — don't call this from an
// article route.
//
// Usable from a Server Component or Server Action. Redirects (rather than
// throwing) so a page hitting this mid-render sends the user straight to
// the onboarding flow instead of an error boundary.
export async function requireOnboarded(): Promise<{ userId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const onboarded = await isOnboarded(supabase, user.id)
  if (!onboarded) redirect('/onboarding')

  return { userId: user.id }
}
