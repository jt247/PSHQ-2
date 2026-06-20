import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { togglePathwayPublishAction } from './actions'

const STATUS_COLORS: Record<string, string> = {
  published: '#d1fae5',
  coming_soon: '#f3f4f6',
  archived: '#fee2e2',
}

export default async function CurriculumAdminPage() {
  const service = createServiceClient()

  const { data: pathways } = await service
    .from('curriculum_pathways')
    .select('id, slug, title, description, status, display_order')
    .order('display_order', { ascending: true })

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link href="/admin/initiatives" className="back-link">← Initiatives</Link>
          <h1>Open PM Curriculum</h1>
          <p className="admin-page-subtitle">{pathways?.length ?? 0} pathways</p>
        </div>
      </div>

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Pathway</th>
              <th>Slug</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(pathways ?? []).map(pw => (
              <tr key={pw.id}>
                <td style={{ color: '#9ca3af', fontSize: '0.8125rem', width: '48px' }}>{pw.display_order}</td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{pw.title}</div>
                  {pw.description && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.125rem' }}>{pw.description}</div>}
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#6b7280' }}>{pw.slug}</td>
                <td>
                  <span style={{
                    background: STATUS_COLORS[pw.status] ?? '#f3f4f6',
                    padding: '0.1875rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    {pw.status === 'coming_soon' ? 'Coming Soon' : pw.status === 'published' ? 'Published' : pw.status}
                  </span>
                </td>
                <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link href={`/admin/initiatives/curriculum/${pw.id}`} className="btn-ghost" style={{ padding: '0.25rem 0.625rem', fontSize: '0.8125rem' }}>
                    Stages
                  </Link>
                  <form action={togglePathwayPublishAction.bind(null, pw.id, pw.status)}>
                    <button type="submit" className="btn-ghost" style={{
                      padding: '0.25rem 0.625rem', fontSize: '0.8125rem',
                      color: pw.status === 'published' ? '#ef4444' : '#10b981',
                    }}>
                      {pw.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
