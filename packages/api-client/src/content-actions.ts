import type { SupabaseClient } from '@supabase/supabase-js'
import { awardContribution } from './community'
import {
  trackResourceSaved, trackResourceUnsaved, trackResourceShared,
  trackContentCompleted, trackContentMarkedComplete, trackContributionScored,
  type EventSource,
} from '@pshq/analytics'

// Epic I §I.6/Standing Rule 2 — favorite/mark-complete/share never existed
// on mobile at all (Step 0 found this: content_favorites/content_progress
// were read-only on the Profile dashboard, nothing wrote them). Built here
// instead of inline in a mobile screen so it's real shared logic from day
// one, not a second implementation web would need consolidating later.
// content_favorites and content_progress are both self-insert/update under
// RLS (see their policies), so this takes the caller's own RLS-bound
// client — no service role needed, same as web's original actions.

interface ToggleResult { error?: string }

export async function toggleFavorite(
  supabase: SupabaseClient, source: EventSource, userId: string, contentId: string, isFavorited: boolean,
): Promise<ToggleResult> {
  if (isFavorited) {
    const { error } = await supabase.from('content_favorites').delete().eq('content_id', contentId).eq('user_id', userId)
    if (error) return { error: error.message }
    await trackResourceUnsaved({ supabase, source, userId }, { contentId })
    return {}
  }

  const { error } = await supabase.from('content_favorites').insert({ content_id: contentId, user_id: userId })
  if (error) return { error: error.message }
  await trackResourceSaved({ supabase, source, userId }, { contentId })

  const scored = await awardContribution(supabase, 'favorite', contentId, contentId)
  if (scored) await trackContributionScored({ supabase, source, userId }, 'favorite', 1, contentId)
  return {}
}

export async function toggleContentComplete(
  supabase: SupabaseClient, source: EventSource, userId: string, contentId: string, isComplete: boolean, auto = false,
): Promise<ToggleResult> {
  const now = new Date().toISOString()
  const { error } = await supabase.from('content_progress').upsert(
    { user_id: userId, content_id: contentId, status: isComplete ? 'completed' : 'not_started', completed_at: isComplete ? now : null, updated_at: now },
    { onConflict: 'user_id,content_id' }
  )
  if (error) return { error: error.message }

  if (isComplete) {
    await trackContentCompleted({ supabase, source, userId }, { contentId })
    await trackContentMarkedComplete({ supabase, source, userId }, { contentId, metadata: { auto } })
    const scored = await awardContribution(supabase, 'content_completed', contentId, contentId)
    if (scored) await trackContributionScored({ supabase, source, userId }, 'content_completed', 2, contentId)
  }
  return {}
}

export async function logShare(supabase: SupabaseClient, source: EventSource, userId: string | null, contentId: string): Promise<void> {
  try {
    await supabase.from('content_interactions').insert({ content_id: contentId, user_id: userId, type: 'share', metadata: {} })
  } catch { /* non-fatal, same posture as web's logShareAction */ }
  await trackResourceShared({ supabase, source, userId }, { contentId })
}
