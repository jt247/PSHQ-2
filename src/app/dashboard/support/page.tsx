import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { UserRow, SupportTicketRow } from '@/types/database'

const STATUS_COLORS: Record<string, string> = {
  open: '#1d4ed8', in_progress: '#c2410c', resolved: '#15803d', closed: '#6b7280',
}

export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profileRaw } = await supabase.from('users').select('role').eq('id', user.id).single()
  const profile = profileRaw as Pick<UserRow, 'role'> | null
  if (!profile) redirect('/sign-in')

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, subject, status, priority, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const rows = (tickets ?? []) as Array<Pick<SupportTicketRow, 'id' | 'ticket_number' | 'subject' | 'status' | 'priority' | 'created_at' | 'updated_at'>>

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <h1 style={h1}>Support tickets</h1>
          <p style={sub}>Track and manage your support requests.</p>
        </div>
        <Link href="/dashboard/support/new" style={btnPrimary}>+ New ticket</Link>
      </div>

      {rows.length === 0 ? (
        <div style={empty}>
          No tickets yet. <Link href="/dashboard/support/new" style={{ color: '#6366f1' }}>Submit one →</Link>
        </div>
      ) : (
        <div style={card}>
          <table style={table}>
            <thead>
              <tr>
                {['#', 'Subject', 'Status', 'Priority', 'Updated'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(t => {
                const color = STATUS_COLORS[t.status] ?? '#374151'
                return (
                  <tr key={t.id}>
                    <td style={td}>
                      <span style={{ fontVariantNumeric: 'tabular-nums', color: '#9ca3af', fontSize: '0.8125rem' }}>
                        #{t.ticket_number}
                      </span>
                    </td>
                    <td style={td}>
                      <Link href={`/dashboard/support/${t.id}`} style={{ color: '#111827', fontWeight: 500, textDecoration: 'none', fontSize: '0.9375rem' }}>
                        {t.subject}
                      </Link>
                    </td>
                    <td style={td}>
                      <span style={{ ...badge, background: `${color}18`, color }}>{t.status.replace('_', ' ')}</span>
                    </td>
                    <td style={td}>
                      <span style={{ ...badge, background: '#f3f4f6', color: '#374151' }}>{t.priority}</span>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                        {new Date(t.updated_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
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

const page: React.CSSProperties  = { maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif' }
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem' }
const h1: React.CSSProperties    = { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }
const sub: React.CSSProperties   = { color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }
const btnPrimary: React.CSSProperties = { padding: '0.5rem 1rem', background: '#111827', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }
const empty: React.CSSProperties = { padding: '3rem', textAlign: 'center', color: '#9ca3af', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px' }
const card: React.CSSProperties  = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }
const th: React.CSSProperties    = { padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }
const td: React.CSSProperties    = { padding: '0.75rem 1rem', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }
const badge: React.CSSProperties = { display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }
