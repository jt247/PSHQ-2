import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { UserRow } from '@/types/database'
import { QualityRow } from './client'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (p as Pick<UserRow, 'role'> | null)?.role
  if (role !== 'admin' && role !== 'super_admin') redirect('/dashboard')
}

export default async function AdminQualityPage() {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: ratings } = await supabase
    .from('ratings')
    .select('id, score, review_text, is_hidden, created_at, content:content_id(id, title, slug, type), user:user_id(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = ((ratings ?? []) as unknown[]) as Array<{
    id: string; score: number; review_text: string | null; is_hidden: boolean; created_at: string;
    content: { id: string; title: string; slug: string; type: string } | null;
    user: { full_name: string | null; email: string } | null
  }>

  return (
    <div className="admin-main-inner">
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Quality control</h1>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
        Review and moderate user ratings and written reviews.
      </p>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              {['Content', 'Reviewer', 'Score', 'Review', 'Status', 'Action'].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => <QualityRow key={r.id} row={r} />)}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No reviews yet.</div>
        )}
      </div>
    </div>
  )
}
