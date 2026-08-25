'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

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
