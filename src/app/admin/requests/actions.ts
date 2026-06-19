'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { UserRow, RequestStatus } from '@/types/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const profile = p as UserRow | null
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) throw new Error('Forbidden')
  return supabase
}

export async function updateRequestStatusAction(requestId: string, status: RequestStatus) {
  const supabase = await requireAdmin()
  await supabase.from('content_requests').update({ status }).eq('id', requestId)
  revalidatePath('/admin/requests')
}
