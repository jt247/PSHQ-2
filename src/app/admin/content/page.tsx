import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContentTableClient } from './ContentTableClient'
import type { UserRow } from '@/types/database'

export default async function AdminContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profileRaw } = await supabase.from('users').select('*').eq('id', user.id).single()
  const profile = profileRaw as UserRow | null
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  // Fetch all content — admins see everything including drafts + archived
  const { data: content, error } = await supabase
    .from('content')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Content Command Center</h1>
          <p className="admin-page-subtitle">{content?.length ?? 0} items total</p>
        </div>
        <Link href="/admin/content/new" className="btn-primary">+ New content</Link>
      </div>

      <ContentTableClient content={content ?? []} />
    </div>
  )
}
