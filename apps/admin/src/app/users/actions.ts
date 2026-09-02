'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@pshq/api-client/server'
import { createServiceClient } from '@pshq/api-client/server'
import { logAdminAction } from '@/lib/admin/log'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'super_admin'].includes(p.role)) throw new Error('Forbidden')
  return user
}

export async function updateUserRoleAction(userId: string, newRole: string) {
  const admin = await requireAdmin()
  const service = createServiceClient()
  const { error } = await service.from('users').update({ role: newRole }).eq('id', userId)
  if (error) throw new Error(error.message)
  await logAdminAction({ admin_id: admin.id, action_type: 'user_role_update', target_table: 'users', target_id: userId, metadata: { new_role: newRole } })
  revalidatePath('/users')
}

// Epic G §G.3 — replaces having no suspend mechanism at all. Routes through
// the SECURITY DEFINER suspend_user()/restore_user() RPCs (own admin client,
// not service role, so is_admin()/auth.uid() checks inside the function are
// real — same pattern Epic F used for admin_grant_contribution) rather than
// a raw table update, so the "cannot suspend yourself" guard can't be
// bypassed by calling this action directly.
export async function suspendUserAction(userId: string, reason: string) {
  const admin = await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.rpc('suspend_user', { p_target_user_id: userId, p_reason: reason || null })
  if (error) throw new Error(error.message)
  await logAdminAction({ admin_id: admin.id, action_type: 'user_suspend', target_table: 'users', target_id: userId, metadata: { reason } })
  revalidatePath('/users')
}

export async function restoreUserAction(userId: string) {
  const admin = await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.rpc('restore_user', { p_target_user_id: userId })
  if (error) throw new Error(error.message)
  await logAdminAction({ admin_id: admin.id, action_type: 'user_restore', target_table: 'users', target_id: userId, metadata: {} })
  revalidatePath('/users')
}

// Wraps Epic F's admin_adjust_score — same RPC the /community page already
// uses, surfaced here too since Step 3 asks for points adjustment directly
// from User Management, not only from the separate Community page.
export async function adjustUserPointsAction(userId: string, delta: number, note: string) {
  const admin = await requireAdmin()
  const supabase = await createClient()
  if (!Number.isFinite(delta) || delta === 0) throw new Error('Enter a non-zero point adjustment.')
  const { error } = await supabase.rpc('admin_adjust_score', { p_target_user_id: userId, p_delta: delta, p_note: note || null })
  if (error) throw new Error(error.message)
  await logAdminAction({ admin_id: admin.id, action_type: 'user_points_adjustment', target_table: 'leaderboard_scores', target_id: userId, metadata: { delta, note } })
  revalidatePath('/users')
}

export interface UserDetail {
  contentCompleted: number
  casesCompleted: number
  modulesCompleted: number
  learningPathsStarted: number
  learningPathsCompleted: number
  totalScore: number
  achievements: Array<{ key: string; title: string; earned_at: string }>
  feedback: Array<{ id: string; category: string; message: string; status: string; created_at: string }>
  recentActivity: Array<{ type: string; created_at: string; label: string }>
}

// Fetched on demand when the drawer opens rather than for every row in the
// list — Step 3 asks for activity/learning-progress/feedback/achievements
// per user, which would be an expensive join across 7 tables for every row
// on the list page.
export async function getUserDetailAction(userId: string): Promise<UserDetail> {
  await requireAdmin()
  const service = createServiceClient()

  const [contentProg, caseProg, moduleProg, userPaths, score, achievements, feedback, recentContent] = await Promise.all([
    service.from('content_progress').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
    service.from('case_progress').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
    service.from('module_progress').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
    service.from('user_learning_paths').select('completed_at').eq('user_id', userId),
    service.from('leaderboard_scores').select('total_score').eq('user_id', userId).maybeSingle(),
    service.from('user_achievements').select('earned_at, achievements(key, title)').eq('user_id', userId).order('earned_at', { ascending: false }),
    service.from('feedback').select('id, category, message, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    service.from('content_progress').select('completed_at, content:content_id(title)').eq('user_id', userId).eq('status', 'completed').order('completed_at', { ascending: false }).limit(10),
  ])

  return {
    contentCompleted: contentProg.count ?? 0,
    casesCompleted: caseProg.count ?? 0,
    modulesCompleted: moduleProg.count ?? 0,
    learningPathsStarted: userPaths.data?.length ?? 0,
    learningPathsCompleted: userPaths.data?.filter(p => p.completed_at).length ?? 0,
    totalScore: score.data?.total_score ?? 0,
    achievements: ((achievements.data ?? []) as unknown as Array<{ earned_at: string; achievements: { key: string; title: string } | null }>)
      .filter(a => a.achievements)
      .map(a => ({ key: a.achievements!.key, title: a.achievements!.title, earned_at: a.earned_at })),
    feedback: (feedback.data ?? []) as UserDetail['feedback'],
    recentActivity: ((recentContent.data ?? []) as unknown as Array<{ completed_at: string; content: { title: string } | null }>)
      .map(c => ({ type: 'content_completed', created_at: c.completed_at, label: c.content?.title ?? 'Untitled content' })),
  }
}
