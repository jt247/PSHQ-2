import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRow } from '@/types/database'
import { AdminRequestRow } from './client'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (p as Pick<UserRow, 'role'> | null)?.role
  if (role !== 'admin' && role !== 'super_admin') redirect('/dashboard')
  return supabase
}

export default async function AdminRequestsPage() {
  const supabase = await requireAdmin()

  const { data: requests } = await supabase
    .from('content_requests')
    .select('id, title, description, status, content_type_requested, created_at, user:user_id(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = ((requests ?? []) as unknown[]) as Array<{
    id: string; title: string; description: string | null; status: string;
    content_type_requested: string | null; created_at: string;
    user: { full_name: string | null; email: string } | null
  }>

  return (
    <div className="admin-main-inner">
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Content requests</h1>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              {['Submitted by', 'Title', 'Type', 'Status', 'Date', 'Action'].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => <AdminRequestRow key={r.id} row={r} />)}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No requests yet.</div>
        )}
      </div>
    </div>
  )
}
