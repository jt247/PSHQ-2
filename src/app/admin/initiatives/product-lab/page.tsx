import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  open: 'Open',
  coming_soon: 'Coming Soon',
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#d1fae5',
  open: '#fef9c3',
  coming_soon: '#f3f4f6',
}

export default async function ProductLabAdminPage() {
  const service = createServiceClient()

  const { data: initiative } = await service
    .from('initiatives')
    .select('id')
    .eq('slug', 'product-lab-with-jt')
    .single()

  const { data: editions } = await service
    .from('initiative_editions')
    .select('id, edition_number, title, status, display_order, join_method')
    .eq('initiative_id', initiative?.id ?? '')
    .order('display_order', { ascending: true })

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link href="/admin/initiatives" className="back-link">← Initiatives</Link>
          <h1>Product Lab with JT</h1>
          <p className="admin-page-subtitle">{editions?.length ?? 0} editions</p>
        </div>
        <Link href="/admin/initiatives/product-lab/new" className="btn-primary">+ New edition</Link>
      </div>

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Edition</th>
              <th>Title</th>
              <th>Status</th>
              <th>Join Method</th>
              <th>Order</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(editions ?? []).map(ed => (
              <tr key={ed.id}>
                <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{ed.edition_number}</td>
                <td className="td-title">{ed.title}</td>
                <td>
                  <span style={{
                    background: STATUS_COLORS[ed.status] ?? '#f3f4f6',
                    padding: '0.1875rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    {STATUS_LABELS[ed.status] ?? ed.status}
                  </span>
                </td>
                <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                  {ed.join_method === 'invitation_email' ? 'Invite only' : ed.join_method === 'open' ? 'Open' : '—'}
                </td>
                <td style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>{ed.display_order}</td>
                <td>
                  <Link href={`/admin/initiatives/product-lab/${ed.id}`} className="btn-ghost" style={{ padding: '0.25rem 0.625rem', fontSize: '0.8125rem' }}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {(!editions || editions.length === 0) && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                  No editions yet. <Link href="/admin/initiatives/product-lab/new" style={{ color: '#6366f1' }}>Create one →</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
