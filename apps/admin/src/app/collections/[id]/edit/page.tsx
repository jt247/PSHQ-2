import { webUrl } from '@/lib/auth/actions'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { CollectionForm } from '@/components/admin/CollectionForm'
import { CollectionItems } from '@/components/admin/CollectionItems'
import { updateCollectionAction, setCollectionStatusAction } from '../../actions'
import type { UserRow } from '@pshq/database'

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'super_admin'].includes((p as UserRow).role)) redirect(`${webUrl()}/dashboard`)

  const service = createServiceClient()
  const [collectionRes, itemsRes, contentRes] = await Promise.all([
    service.from('collections').select('*').eq('id', id).single(),
    service.from('collection_items').select('id, content_id, display_order, content:content_id(title, type)').eq('collection_id', id).order('display_order'),
    service.from('content').select('id, title').eq('status', 'published').order('title').limit(300),
  ])

  if (collectionRes.error || !collectionRes.data) notFound()
  const collection = collectionRes.data

  const items = ((itemsRes.data ?? []) as unknown as Array<{ id: string; content_id: string; content: { title: string; type: string } | null }>)
    .map(i => ({ id: i.id, content_id: i.content_id, title: i.content?.title ?? 'Untitled', type: i.content?.type ?? '' }))

  const boundUpdate = updateCollectionAction.bind(null, id)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link href="/collections" className="back-link">← Collections</Link>
          <h1>Edit: {collection.title}</h1>
          <p className="admin-page-subtitle"><span className={`badge badge-${collection.status === 'published' ? 'green' : collection.status === 'archived' ? 'red' : 'gray'}`}>{collection.status}</span></p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '0.5rem' }}>
          {collection.status !== 'published' && <form action={setCollectionStatusAction.bind(null, id, 'published')}><button type="submit" className="btn-primary">Publish</button></form>}
          {collection.status === 'published' && <form action={setCollectionStatusAction.bind(null, id, 'draft')}><button type="submit" className="btn-ghost">Unpublish</button></form>}
          {collection.status !== 'archived' && <form action={setCollectionStatusAction.bind(null, id, 'archived')}><button type="submit" className="btn-ghost" style={{ color: '#dc2626' }}>Archive</button></form>}
        </div>
      </div>

      <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <CollectionForm collection={collection} action={boundUpdate} />
      </div>

      <div className="admin-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 1rem' }}>Items</h2>
        <CollectionItems collectionId={id} items={items} contentOptions={contentRes.data ?? []} />
      </div>
    </div>
  )
}
