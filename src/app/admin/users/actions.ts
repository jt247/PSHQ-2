'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
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
  revalidatePath('/admin/users')
}
