import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { UserRow } from '@/types/database'

const STATUS_COLORS: Record<string, string> = {
  open: '#1d4ed8', in_progress: '#c2410c', resolved: '#15803d', closed: '#6b7280',
}

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (p as Pick<UserRow, 'role'> | null)?.role
  if (role !== 'admin' && role !== 'super_admin') redirect('/dashboard')
  return supabase
}

export default async function AdminSupportPage({ searchParams }: PageProps) {
  const { status } = await searchParams
  const supabase = await requireAdmin()

  let query = supabase
    .from('support_tickets')
    .select(`
      id, ticket_number, subject, status, priority, created_at, updated_at, email,
      user:user_id(full_name, email)
    `)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)

  const { data: tickets } = await query
  const rows = ((tickets ?? []) as unknown[]) as Array<{
    id: string; ticket_number: number; subject: string; status: string; priority: string;
    created_at: string; updated_at: string; email: string | null;
    user: { full_name: string | null; email: string } | null
  }>

  const STATUSES = ['open', 'in_progress', 'resolved', 'closed']

  return (
    <div className="admin-main-inner">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Support tickets</h1>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <Link href="/admin/support" style={filterBtn(!status)}>All</Link>
        {STATUSES.map(s => (
          <Link key={s} href={`/admin/support?status=${s}`} style={filterBtn(status === s)}>
            {s.replace('_', ' ')}
          </Link>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              {['#', 'User', 'Subject', 'Status', 'Priority', 'Updated'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(t => {
              const color = STATUS_COLORS[t.status] ?? '#374151'
              const displayEmail = t.user?.email ?? t.email ?? '—'
              const displayName = t.user?.full_name ?? displayEmail
              return (
                <tr key={t.id}>
                  <td style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>#{t.ticket_number}</td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{displayName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{displayEmail}</div>
                  </td>
                  <td>
                    <Link href={`/admin/support/${t.id}`} style={{ color: '#111827', fontWeight: 500, textDecoration: 'none' }}>
                      {t.subject}
                    </Link>
                  </td>
                  <td><span style={{ ...badge, background: `${color}18`, color }}>{t.status.replace('_', ' ')}</span></td>
                  <td><span style={{ ...badge, background: '#f3f4f6', color: '#374151' }}>{t.priority}</span></td>
                  <td style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                    {new Date(t.updated_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No tickets found.</div>
        )}
      </div>
    </div>
  )
}

const filterBtn = (active: boolean): React.CSSProperties => ({
  padding: '0.375rem 0.875rem', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 500,
  textDecoration: 'none', background: active ? '#111827' : '#f3f4f6', color: active ? '#fff' : '#374151',
  textTransform: 'capitalize',
})
const badge: React.CSSProperties = { display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }
