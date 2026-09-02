import { webUrl } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import type { UserRow } from '@pshq/database'
import { ModerationClient } from './client'

interface PageProps { searchParams: Promise<{ view?: string }> }

export default async function ModerationPage({ searchParams }: PageProps) {
  const { view = 'flagged' } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'super_admin'].includes((p as UserRow).role)) redirect(`${webUrl()}/dashboard`)

  const service = createServiceClient()
  let query = service
    .from('content_comments')
    .select('id, body, is_hidden, is_flagged, is_approved, created_at, user_id, user:user_id(full_name, email), content:content_id(title, slug)')
    .order('created_at', { ascending: false })
    .limit(150)

  if (view === 'flagged') query = query.eq('is_flagged', true)
  if (view === 'hidden') query = query.eq('is_hidden', true)
  // view === 'all' — no extra filter

  const { data } = await query
  const rows = (data ?? []) as unknown as Array<{
    id: string; body: string; is_hidden: boolean; is_flagged: boolean; is_approved: boolean;
    created_at: string; user_id: string; user: { full_name: string | null; email: string } | null;
    content: { title: string; slug: string } | null
  }>

  return <ModerationClient rows={rows} currentView={view} />
}
