'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@pshq/api-client/server'
import { webUrl } from '@/lib/web-url'

export { webUrl }

// The admin app has no sign-in page of its own — it's a separate deployment
// from apps/web, gated by proxy.ts requiring an admin/super_admin session.
// Signing out sends the user back to the main site's sign-in page.
export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(`${webUrl()}/sign-in`)
}
