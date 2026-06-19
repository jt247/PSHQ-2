'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/admin/log'
import type { UserRow } from '@/types/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const profile = p as UserRow | null
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) throw new Error('Forbidden')
  return { supabase, adminId: user.id }
}

export async function toggleReviewVisibilityAction(ratingId: string, hide: boolean) {
  const { supabase, adminId } = await requireAdmin()
  await supabase.from('ratings').update({ is_hidden: hide }).eq('id', ratingId)
  await logAdminAction({ admin_id: adminId, action_type: hide ? 'review_hide' : 'review_show', target_table: 'ratings', target_id: ratingId })
  revalidatePath('/admin/quality')
}
