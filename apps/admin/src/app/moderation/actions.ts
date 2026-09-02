'use server'
import { webUrl } from '@/lib/auth/actions'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@pshq/api-client/server'
import { logAdminAction } from '@/lib/admin/log'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'super_admin'].includes(p.role)) redirect('/')
  return { supabase, adminId: user.id }
}

// Epic G Step 11 — closes the comment moderation gap Build Prompt 7
// explicitly deferred. Routes through the moderate_comment() SECURITY
// DEFINER RPC (same pattern as Epic F's admin functions) rather than a raw
// update, so is_admin() is checked inside the function regardless of RLS.
export async function toggleCommentHiddenAction(commentId: string, hide: boolean) {
  const { supabase, adminId } = await requireAdmin()
  const { error } = await supabase.rpc('moderate_comment', { p_comment_id: commentId, p_hide: hide })
  if (error) throw new Error(error.message)
  await logAdminAction({ admin_id: adminId, action_type: hide ? 'comment_hide' : 'comment_unhide', target_table: 'content_comments', target_id: commentId })
  revalidatePath('/moderation')
}

// Approving a comment as a helpful community contribution — feeds the
// community_contribution_approved scoring action (Epic F) via
// admin_grant_contribution, deduped on the comment id so re-approving the
// same comment (e.g. a page refresh double-click) can't double-score it.
export async function approveCommentContributionAction(commentId: string, authorUserId: string) {
  const { supabase, adminId } = await requireAdmin()

  const { error: rpcError } = await supabase.rpc('admin_grant_contribution', {
    p_target_user_id: authorUserId,
    p_action: 'community_contribution_approved',
    p_ref_id: commentId,
    p_dedupe_key: commentId,
  })
  if (rpcError) throw new Error(rpcError.message)

  const { error } = await supabase.from('content_comments').update({ is_approved: true, moderated_by: adminId, moderated_at: new Date().toISOString() }).eq('id', commentId)
  if (error) throw new Error(error.message)

  await logAdminAction({ admin_id: adminId, action_type: 'comment_approve_contribution', target_table: 'content_comments', target_id: commentId, metadata: { authorUserId } })
  revalidatePath('/moderation')
}
