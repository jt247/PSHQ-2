import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContentForm } from '@/components/admin/ContentForm'
import { createContentAction } from '../actions'
import type { UserRow } from '@/types/database'

export default async function NewContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profileRaw } = await supabase.from('users').select('*').eq('id', user.id).single()
  const profile = profileRaw as UserRow | null
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link href="/admin/content" className="back-link">← Content</Link>
          <h1>New content</h1>
        </div>
      </div>
      <ContentForm mode="create" createAction={createContentAction} />
    </div>
  )
}
