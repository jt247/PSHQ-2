import { webUrl } from '@/lib/auth/actions'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import type { UserRow } from '@pshq/database'

const STATUS_COLORS: Record<string, string> = { draft: 'gray', published: 'green', archived: 'red' }

export default async function CollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'super_admin'].includes((p as UserRow).role)) redirect(`${webUrl()}/dashboard`)

  const service = createServiceClient()
  const { data: collections } = await service
    .from('collections')
    .select('id, title, slug, status, display_order, collection_items(count)')
    .order('display_order')

  const rows = (collections ?? []) as unknown as Array<{ id: string; title: string; slug: string; status: string; collection_items: { count: number }[] }>

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Collections</h1>
          <p className="admin-page-subtitle">{rows.length} collections</p>
        </div>
        <div className="header-actions">
          <Link href="/collections/new" className="btn-primary">+ New collection</Link>
        </div>
      </div>

      <div className="table-scroll">
        <table className="admin-table">
          <thead><tr><th>Title</th><th>Items</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="table-empty">No collections yet.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className={r.status === 'archived' ? 'row-archived' : ''}>
                <td className="td-title">{r.title}<div className="table-slug">{r.slug}</div></td>
                <td className="td-num">{r.collection_items?.[0]?.count ?? 0}</td>
                <td><span className={`badge badge-${STATUS_COLORS[r.status] ?? 'gray'}`}>{r.status}</span></td>
                <td className="td-actions"><Link href={`/collections/${r.id}/edit`} className="action-btn">Edit →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
