'use server'

import { createClient, createServiceClient } from '@pshq/api-client/server'
import { awardContribution } from '@pshq/api-client/community'
import { trackExerciseCompleted, trackContentCompleted, trackContentMarkedComplete, trackContributionScored, trackResourceSaved, trackResourceUnsaved, trackRatingSubmitted, trackListenStarted, trackListenCompleted, trackResourceShared } from '@pshq/analytics'

// Fire-and-forget analytics only — the actual share (native sheet or
// clipboard copy) already happened client-side by the time this runs.
// Written via the service client for the same reason /api/view and
// /api/download are: the RLS-bound client's insert would leave the
// triggering role unable to update content counts if this content type
// ever grows a share_count column later.
export async function logShareAction(contentId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const service = createServiceClient()
    await service.from('content_interactions').insert({
      content_id: contentId,
      user_id: user?.id ?? null,
      type: 'share',
      metadata: {},
    })
  } catch { /* non-fatal */ }

  await trackResourceShared({ supabase, source: 'web', userId: user?.id ?? null }, { contentId })
}

// Same fire-and-forget pattern as logShareAction. Logged once per fresh
// playback start (not on resume) — see ListenButton's status transition.
// Epic H §H.1 — also fires the typed listen_started event on analytics_events
// (the content_interactions row above predates this epic and stays for its
// existing consumers; this epic's analytics layer reads the typed event).
export async function logListenAction(contentId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const service = createServiceClient()
    await service.from('content_interactions').insert({
      content_id: contentId,
      user_id: user?.id ?? null,
      type: 'listen',
      metadata: {},
    })
  } catch { /* non-fatal */ }

  await trackListenStarted({ supabase, source: 'web', userId: user?.id ?? null }, { contentId })
}

// Fired when TTS playback reaches the natural end of the text (not on pause
// or navigating away) — the real signal for "listen completed" vs. just
// "listen started."
export async function logListenCompleteAction(contentId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await trackListenCompleted({ supabase, source: 'web', userId: user?.id ?? null }, { contentId })
}

// Favorites are private to the user (RLS: self read/insert/delete), so this
// can go through the RLS-bound client directly — no service client needed.
export async function toggleFavoriteAction(contentId: string, isFavorited: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to save favorites.' }

  if (isFavorited) {
    const { error } = await supabase
      .from('content_favorites')
      .delete()
      .eq('content_id', contentId)
      .eq('user_id', user.id)
    if (error) return { error: error.message }
    await trackResourceUnsaved({ supabase, source: 'web', userId: user.id }, { contentId })
    return {}
  }

  const { error } = await supabase
    .from('content_favorites')
    .insert({ content_id: contentId, user_id: user.id })
  if (error) return { error: error.message }
  await trackResourceSaved({ supabase, source: 'web', userId: user.id }, { contentId })

  // §F.2 +1, deduped on content_id (§F.3: "favoriting and unfavoriting the
  // same item repeatedly must not repeatedly score" — this only ever
  // scores the first time a given item is favorited by this user, ever).
  const scored = await awardContribution(supabase, 'favorite', contentId, contentId)
  if (scored) await trackContributionScored({ supabase, source: 'web', userId: user.id }, 'favorite', 1, contentId)
  return {}
}

// Exercise responses are private (RLS: self read/insert/update/delete —
// never exposed publicly per Epic B §9/§58), so this goes through the
// RLS-bound client directly, same as favorites.
export async function saveExerciseResponseAction(exerciseId: string, response: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to save your response.' }

  const trimmed = response.trim()
  if (!trimmed) return { error: 'Write a response before saving.' }

  const { error } = await supabase.from('exercise_responses').upsert(
    { exercise_id: exerciseId, user_id: user.id, response: { text: trimmed }, updated_at: new Date().toISOString() },
    { onConflict: 'exercise_id,user_id' }
  )
  if (error) return { error: error.message }

  await trackExerciseCompleted({ supabase, source: 'web', userId: user.id }, { contentId: exerciseId })
  return {}
}

export async function deleteExerciseResponseAction(exerciseId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase.from('exercise_responses').delete().eq('exercise_id', exerciseId).eq('user_id', user.id)
  if (error) return { error: error.message }
  return {}
}

// Generic "Mark as Complete" for any content row (article/ebook/template/
// guide/build note) — the piece nothing previously wrote to, which meant
// content_progress existed as a table but a Series page's completion
// checkmarks could never actually light up. Private per-user, same RLS
// pattern as favorites/exercise responses.
// `auto` distinguishes this epic's new automatic scroll/dwell detection
// (AutoCompleteTracker) from the manual button — both call this same
// action so there's exactly one write path for content_progress, but the
// analytics event tags how it happened.
export async function toggleContentCompleteAction(contentId: string, isComplete: boolean, auto = false): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to track progress.' }

  const now = new Date().toISOString()
  const { error } = await supabase.from('content_progress').upsert(
    { user_id: user.id, content_id: contentId, status: isComplete ? 'completed' : 'not_started', completed_at: isComplete ? now : null, updated_at: now },
    { onConflict: 'user_id,content_id' }
  )
  if (error) return { error: error.message }

  if (isComplete) {
    await trackContentCompleted({ supabase, source: 'web', userId: user.id }, { contentId })
    await trackContentMarkedComplete({ supabase, source: 'web', userId: user.id }, { contentId, metadata: { auto } })

    // §F.2 +2, deduped on content_id — re-completing after an un-complete
    // never scores twice for the same item.
    const scored = await awardContribution(supabase, 'content_completed', contentId, contentId)
    if (scored) await trackContributionScored({ supabase, source: 'web', userId: user.id }, 'content_completed', 2, contentId)
  }
  return {}
}

// No-op if already completed (avoids a redundant write + duplicate
// analytics event on every subsequent visit past the scroll threshold).
// If a member manually un-completes something afterward, scrolling to the
// bottom again in a later session will legitimately re-complete it — same
// as pressing the manual button again.
export async function autoMarkContentCompleteAction(contentId: string): Promise<{ error?: string; skipped?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: existing } = await supabase.from('content_progress').select('status').eq('user_id', user.id).eq('content_id', contentId).maybeSingle()
  if (existing?.status === 'completed') return { skipped: true }

  return toggleContentCompleteAction(contentId, true, true)
}
