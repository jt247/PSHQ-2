'use server'

import { createClient, createServiceClient } from '@pshq/api-client/server'

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
}

// Same fire-and-forget pattern as logShareAction. Logged once per fresh
// playback start (not on resume) — see ListenButton's status transition.
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
    return {}
  }

  const { error } = await supabase
    .from('content_favorites')
    .insert({ content_id: contentId, user_id: user.id })
  if (error) return { error: error.message }
  return {}
}
