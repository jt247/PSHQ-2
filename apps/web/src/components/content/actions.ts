'use server'

import { createClient } from '@pshq/api-client/server'
import { trackRelatedContentClicked } from '@pshq/analytics'

// Epic H §H.1 — fire-and-forget, called from ContinueFromHereSection's
// onClick before navigation. Never blocks or fails the click itself.
export async function trackRelatedClickAction(fromContentId: string, toContentId: string): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await trackRelatedContentClicked(
      { supabase, source: 'web', userId: user?.id ?? null },
      { contentId: toContentId, metadata: { fromContentId } },
    )
  } catch { /* non-fatal */ }
}
