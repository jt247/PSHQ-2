import { webUrl } from '@/lib/auth/actions'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@pshq/api-client/server'
import { CollectionForm } from '@/components/admin/CollectionForm'
import { createCollectionAction } from '../actions'
import type { UserRow } from '@pshq/database'

export default async function NewCollectionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'super_admin'].includes((p as UserRow).role)) redirect(`${webUrl()}/dashboard`)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link href="/collections" className="back-link">← Collections</Link>
          <h1>New collection</h1>
        </div>
      </div>
      <CollectionForm action={createCollectionAction} />
    </div>
  )
}
