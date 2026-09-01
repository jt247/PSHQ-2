'use server'

import { createClient } from '@pshq/api-client/server'
import { awardContribution } from '@pshq/api-client/community'
import { trackContentCompleted, trackContentMarkedComplete, trackContributionScored } from '@pshq/analytics'

// Case studies live in case_library_entries, a separate table from
// content, so they can't use content_favorites/content_progress (both
// FK'd to content.id) — case_favorites/case_progress (Epic D migration
// 20260901000028) mirror that shape exactly. Same RLS pattern as
// toggleFavoriteAction/toggleContentCompleteAction in
// (public)/content/[slug]/actions.ts.
export async function toggleCaseFavoriteAction(caseId: string, isFavorited: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to save favorites.' }

  if (isFavorited) {
    const { error } = await supabase.from('case_favorites').delete().eq('case_id', caseId).eq('user_id', user.id)
    if (error) return { error: error.message }
    return {}
  }

  const { error } = await supabase.from('case_favorites').insert({ case_id: caseId, user_id: user.id })
  if (error) return { error: error.message }

  const scored = await awardContribution(supabase, 'favorite', caseId, caseId)
  if (scored) await trackContributionScored({ supabase, source: 'web', userId: user.id }, 'favorite', 1, caseId)
  return {}
}

export async function toggleCaseCompleteAction(caseId: string, isComplete: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to track progress.' }

  const now = new Date().toISOString()
  const { error } = await supabase.from('case_progress').upsert(
    { user_id: user.id, case_id: caseId, status: isComplete ? 'completed' : 'not_started', completed_at: isComplete ? now : null, updated_at: now },
    { onConflict: 'user_id,case_id' }
  )
  if (error) return { error: error.message }

  // Reuses content_completed (not a new event) — case studies aren't a
  // `content` row so contentType 'article' is the closest existing
  // taxonomy value, same substitution trackContentOpened already makes
  // for cases elsewhere in this file's page.
  if (isComplete) {
    await trackContentCompleted({ supabase, source: 'web', userId: user.id }, { contentId: caseId, contentType: 'article' })
    await trackContentMarkedComplete({ supabase, source: 'web', userId: user.id }, { contentId: caseId, metadata: { auto: false } })

    const scored = await awardContribution(supabase, 'content_completed', caseId, caseId)
    if (scored) await trackContributionScored({ supabase, source: 'web', userId: user.id }, 'content_completed', 2, caseId)
  }
  return {}
}
