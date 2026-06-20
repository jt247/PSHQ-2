import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { archiveCaseEntryAction } from './actions'

const STATUS_COLORS: Record<string, string> = {
  published: '#d1fae5',
  draft: '#f3f4f6',
  archived: '#fee2e2',
}

export default async function CaseLibraryAdminPage() {
  const service = createServiceClient()

  const { data: entries } = await service
    .from('case_library_entries')
    .select('id, title, company_name, status, tags, published_at, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link href="/admin/initiatives" className="back-link">← Initiatives</Link>
          <h1>Product Case Library</h1>
          <p className="admin-page-subtitle">{entries?.length ?? 0} entries</p>
        </div>
        <Link href="/admin/initiatives/case-library/new" className="btn-primary">+ New entry</Link>
      </div>

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Company</th>
              <th>Tags</th>
              <th>Status</th>
              <th>Published</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(entries ?? []).map(entry => (
              <tr key={entry.id}>
                <td className="td-title">{entry.title}</td>
                <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{entry.company_name}</td>
                <td style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {(entry.tags ?? []).slice(0, 3).join(', ') || '—'}
                </td>
                <td>
                  <span style={{
                    background: STATUS_COLORS[entry.status] ?? '#f3f4f6',
                    padding: '0.1875rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    {entry.status}
                  </span>
                </td>
                <td style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                  {entry.published_at
                    ? new Date(entry.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                    : '—'}
                </td>
                <td style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link href={`/admin/initiatives/case-library/${entry.id}`} className="btn-ghost" style={{ padding: '0.25rem 0.625rem', fontSize: '0.8125rem' }}>
                    Edit
                  </Link>
                  {entry.status === 'published' && (
                    <form action={archiveCaseEntryAction.bind(null, entry.id)}>
                      <button type="submit" className="btn-ghost" style={{ padding: '0.25rem 0.625rem', fontSize: '0.8125rem', color: '#ef4444' }}>
                        Archive
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {(!entries || entries.length === 0) && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                  No entries yet. <Link href="/admin/initiatives/case-library/new" style={{ color: '#6366f1' }}>Create one →</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
