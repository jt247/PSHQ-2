import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const STATUS_COLORS: Record<string, string> = {
  new: '#1d4ed8', reviewed: '#c2410c', planned: '#7c3aed', rejected: '#6b7280',
}

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: requests } = await supabase
    .from('content_requests')
    .select('id, title, description, status, content_type_requested, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const rows = (requests ?? []) as Array<{
    id: string; title: string; description: string | null; status: string;
    content_type_requested: string | null; created_at: string
  }>

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <h1 style={h1}>Content requests</h1>
          <p style={sub}>Request content you&apos;d like to see on the platform.</p>
        </div>
        <Link href="/dashboard/requests/new" style={btnPrimary}>+ New request</Link>
      </div>

      {rows.length === 0 ? (
        <div style={empty}>
          No requests yet. <Link href="/dashboard/requests/new" style={{ color: '#6366f1' }}>Submit one →</Link>
        </div>
      ) : (
        <div style={card}>
          <table style={table}>
            <thead>
              <tr>
                {['Title', 'Type', 'Status', 'Submitted'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const color = STATUS_COLORS[r.status] ?? '#374151'
                return (
                  <tr key={r.id}>
                    <td style={td}>
                      <span style={{ color: '#111827', fontWeight: 500, fontSize: '0.9375rem' }}>{r.title}</span>
                      {r.description && (
                        <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                          {r.description}
                        </p>
                      )}
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                        {r.content_type_requested ?? '—'}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ ...badge, background: `${color}18`, color }}>{r.status}</span>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                        {new Date(r.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const page: React.CSSProperties = { maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif' }
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem' }
const h1: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }
const sub: React.CSSProperties = { color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }
const btnPrimary: React.CSSProperties = { padding: '0.5rem 1rem', background: '#111827', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }
const empty: React.CSSProperties = { padding: '3rem', textAlign: 'center', color: '#9ca3af', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }
const th: React.CSSProperties = { padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }
const td: React.CSSProperties = { padding: '0.75rem 1rem', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }
const badge: React.CSSProperties = { display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }
