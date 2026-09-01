'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { awardContribution, normalizeCommentText, THOUGHTFUL_COMMENT_MIN_LENGTH } from '@pshq/api-client/community'
import { trackContributionScored } from '@pshq/analytics'

// ── Comments ─────────────────────────────────────────────────

export interface CommentState {
  error?: string
  success?: boolean
}

export async function postCommentAction(
  contentId: string,
  _prev: CommentState,
  formData: FormData,
): Promise<CommentState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to comment.' }

  const body = (formData.get('body') as string ?? '').trim()
  if (!body || body.length < 2) return { error: 'Comment is too short.' }
  if (body.length > 2000) return { error: 'Comment is too long (max 2000 chars).' }

  // §F.3 basic spam detection: block outright (not just de-score) a
  // near-duplicate of the member's own last few comments — catches
  // "great article! great article! great article!" bulk-posting, which a
  // scoring-only dedupe wouldn't stop from cluttering the thread.
  const normalized = normalizeCommentText(body)
  const { data: recentOwn } = await supabase
    .from('content_comments')
    .select('body')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)
  const isDuplicate = (recentOwn ?? []).some(c => normalizeCommentText(c.body) === normalized)
  if (isDuplicate) return { error: 'You already posted something very similar recently.' }

  // Written via the service client, not the RLS-bound one above. The
  // sync_comment_count trigger's internal `update content set
  // comment_count = comment_count + 1` runs as whichever role executed the
  // triggering INSERT. The only UPDATE policy on content is admin-only, so
  // when a normal signed-in user performed the insert, that internal update
  // matched zero rows under RLS — no error, just silently a no-op — and
  // comment_count never moved. Identity is still verified above via the
  // RLS-bound client; only the write goes through the service client.
  const { error } = await createServiceClient().from('content_comments').insert({
    content_id: contentId,
    user_id: user.id,
    body,
  })
  if (error) {
    return { error: 'Failed to post comment. Try again.' }
  }

  // §F.2 +4 "thoughtful comment" — the judgment call this pass makes real
  // per the PRD's own instruction: a length floor stands in for
  // "thoughtful" rather than any real NLP judgment. Deduped on the
  // normalized text itself (not content_id), so distinct real comments on
  // the same article each score, up to the daily cap, but the same
  // near-duplicate text never scores twice even across different articles.
  if (body.length >= THOUGHTFUL_COMMENT_MIN_LENGTH) {
    const scored = await awardContribution(supabase, 'thoughtful_comment', contentId, normalized)
    if (scored) await trackContributionScored({ supabase, source: 'web', userId: user.id }, 'thoughtful_comment', 4, contentId)
  }

  revalidatePath(`/articles`)
  return { success: true }
}

// ── Upvotes ───────────────────────────────────────────────────

export async function toggleUpvoteAction(contentId: string, currentlyUpvoted: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to upvote.' }

  // Confirmed live: a real user's upvote persisted (the content_upvotes row
  // was there on reload) but the displayed count reverted, because
  // content.upvote_count itself never moved. sync_upvote_count's internal
  // `update content set upvote_count = upvote_count + 1` runs as the role
  // that performed the triggering insert/delete. content's only UPDATE
  // policy is admin-only, so that internal update matched zero rows under
  // RLS for a normal user — no error, just silently a no-op. The service
  // client makes the whole statement (and the trigger it fires) bypass RLS.
  // auth.getUser() above still verifies identity; user.id is never taken
  // from client input.
  const service = createServiceClient()
  if (currentlyUpvoted) {
    const { error } = await service
      .from('content_upvotes')
      .delete()
      .eq('content_id', contentId)
      .eq('user_id', user.id)
    if (error) return { error: 'Failed to remove upvote.' }
  } else {
    const { error } = await service
      .from('content_upvotes')
      .insert({ content_id: contentId, user_id: user.id })
    if (error) return { error: 'Failed to upvote.' }
  }

  // The detail pages themselves were never revalidated — only the index
  // routes were — so navigating back to an ebook or article served the
  // cached payload from before the vote and the upvote looked like it had
  // been lost. A dynamic segment requires the bracket form plus the 'page'
  // type; both the plain and route-group forms are issued because these
  // routes live under the (public) group.
  revalidatePath('/articles')
  revalidatePath('/library')
  revalidatePath('/articles/[slug]', 'page')
  revalidatePath('/content/[slug]', 'page')
  revalidatePath('/(public)/articles/[slug]', 'page')
  revalidatePath('/(public)/content/[slug]', 'page')
  return { ok: true }
}

// ── Ratings ───────────────────────────────────────────────────

export interface RatingState {
  error?: string
  success?: boolean
}

export async function submitRatingAction(
  contentId: string,
  _prev: RatingState,
  formData: FormData,
): Promise<RatingState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to rate content.' }

  const rating = parseInt(formData.get('rating') as string ?? '0', 10)
  if (rating < 1 || rating > 5) return { error: 'Select a rating from 1–5.' }

  const reviewText = (formData.get('review_text') as string ?? '').trim() || null

  // Upsert (unique constraint: content_id + user_id)
  const { error } = await supabase
    .from('ratings')
    .upsert(
      { content_id: contentId, user_id: user.id, rating: rating as 1|2|3|4|5, review_text: reviewText },
      { onConflict: 'content_id,user_id' }
    )

  if (error) {

    return { error: 'Failed to save rating. Try again.' }
  }

  // §F.2 +1, deduped on content_id — updating an existing rating (the
  // upsert path above) never re-scores, only the first rating ever does.
  const scored = await awardContribution(supabase, 'rating', contentId, contentId)
  if (scored) await trackContributionScored({ supabase, source: 'web', userId: user.id }, 'rating', 1, contentId)

  revalidatePath(`/articles`)
  revalidatePath(`/content`)
  return { success: true }
}
