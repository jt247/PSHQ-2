import { webUrl } from '@/lib/auth/actions'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@pshq/api-client/server'
import { ContentForm } from '@/components/admin/ContentForm'
import { createContentAction } from '../actions'
import type { UserRow } from '@pshq/database'

export default async function NewContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)

  const { data: profileRaw } = await supabase.from('users').select('*').eq('id', user.id).single()
  const profile = profileRaw as UserRow | null
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect(`${webUrl()}/dashboard`)

  const [topics, goals, roles, series] = await Promise.all([
    supabase.from('topics').select('id, name').order('sort_order'),
    supabase.from('goals').select('id, name').order('sort_order'),
    supabase.from('roles').select('id, name').order('sort_order'),
    supabase.from('series').select('id, title').order('title'),
  ])

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link href="/content" className="back-link">← Content</Link>
          <h1>New content</h1>
        </div>
      </div>
      <ContentForm
        mode="create"
        createAction={createContentAction}
        topics={topics.data ?? []}
        goals={goals.data ?? []}
        roles={roles.data ?? []}
        series={series.data ?? []}
      />
    </div>
  )
}
