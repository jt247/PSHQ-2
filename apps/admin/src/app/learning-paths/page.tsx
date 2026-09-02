import { webUrl } from '@/lib/auth/actions'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import type { UserRow } from '@pshq/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (p as Pick<UserRow, 'role'> | null)?.role
  if (role !== 'admin' && role !== 'super_admin') redirect(`${webUrl()}/dashboard`)
}

const STATUS_COLORS: Record<string, string> = { draft: 'gray', published: 'green', archived: 'red' }

export default async function LearningPathsPage() {
  await requireAdmin()
  const service = createServiceClient()

  const { data: paths } = await service
    .from('learning_paths')
    .select('id, title, slug, status, level, display_order, learning_path_modules(count)')
    .order('display_order')

  const rows = (paths ?? []) as unknown as Array<{
    id: string; title: string; slug: string; status: string; level: string | null;
    learning_path_modules: { count: number }[]
  }>

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Learning Paths</h1>
          <p className="admin-page-subtitle">{rows.length} paths — {rows.filter(r => r.status === 'published').length} published</p>
        </div>
        <div className="header-actions">
          <Link href="/learning-paths/new" className="btn-primary">+ New path</Link>
        </div>
      </div>

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr><th>Title</th><th>Level</th><th>Modules</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">No learning paths yet.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className={r.status === 'archived' ? 'row-archived' : ''}>
                <td className="td-title">{r.title}<div className="table-slug">{r.slug}</div></td>
                <td>{r.level ?? '—'}</td>
                <td className="td-num">{r.learning_path_modules?.[0]?.count ?? 0}</td>
                <td><span className={`badge badge-${STATUS_COLORS[r.status] ?? 'gray'}`}>{r.status}</span></td>
                <td className="td-actions"><Link href={`/learning-paths/${r.id}/edit`} className="action-btn">Edit →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
