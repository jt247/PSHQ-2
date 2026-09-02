import { webUrl } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import type { UserRow } from '@pshq/database'
import { NotificationsClient } from './client'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (p as Pick<UserRow, 'role'> | null)?.role
  if (role !== 'admin' && role !== 'super_admin') redirect(`${webUrl()}/dashboard`)
}

export default async function NotificationsPage() {
  await requireAdmin()
  const service = createServiceClient()

  const { data: history } = await service
    .from('notifications')
    .select('id, title, body, channel, sent_at, created_at, audience_filters')
    .order('created_at', { ascending: false })
    .limit(20)

  const pastNotifications = ((history ?? []) as Array<{
    id: string; title: string; body: string; channel: string;
    sent_at: string | null; created_at: string; audience_filters: Record<string, unknown> | null
  }>)

  const { data: paths } = await service.from('learning_paths').select('id, title').order('title')

  return <NotificationsClient pastNotifications={pastNotifications} learningPaths={paths ?? []} />
}
