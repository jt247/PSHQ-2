'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

  const { error } = await supabase.from('content_comments').insert({
    content_id: contentId,
    user_id: user.id,
    body,
  })
  if (error) return { error: 'Failed to post comment. Try again.' }

  revalidatePath(`/articles`)
  return { success: true }
}

// ── Upvotes ───────────────────────────────────────────────────

export async function toggleUpvoteAction(contentId: string, currentlyUpvoted: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to upvote.' }

  if (currentlyUpvoted) {
    await supabase
      .from('content_upvotes')
      .delete()
      .eq('content_id', contentId)
      .eq('user_id', user.id)
  } else {
    await supabase.from('content_upvotes').insert({ content_id: contentId, user_id: user.id })
  }

  revalidatePath(`/articles`)
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

  if (error) return { error: 'Failed to save rating. Try again.' }

  revalidatePath(`/articles`)
  revalidatePath(`/content`)
  return { success: true }
}
