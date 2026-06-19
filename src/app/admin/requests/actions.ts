'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/admin/log'
import type { UserRow, RequestStatus } from '@/types/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const profile = p as UserRow | null
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) throw new Error('Forbidden')
  return { supabase, adminId: user.id }
}

export async function updateRequestStatusAction(requestId: string, status: RequestStatus) {
  const { supabase, adminId } = await requireAdmin()
  await supabase.from('content_requests').update({ status }).eq('id', requestId)
  await logAdminAction({ admin_id: adminId, action_type: `request_status_${status}`, target_table: 'content_requests', target_id: requestId, metadata: { status } })
  revalidatePath('/admin/requests')
}
