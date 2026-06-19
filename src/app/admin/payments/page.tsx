import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRow } from '@/types/database'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (p as Pick<UserRow, 'role'> | null)?.role
  if (role !== 'super_admin') {
    return { supabase, forbidden: true as const }
  }
  return { supabase, forbidden: false as const }
}

export default async function AdminPaymentsPage() {
  const { supabase, forbidden } = await requireSuperAdmin()

  if (forbidden) {
    return (
      <div className="admin-main-inner" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>Access denied</h1>
        <p style={{ color: '#6b7280' }}>This page is only accessible to super admins.</p>
      </div>
    )
  }

  const [purchasesRes, revenueRes] = await Promise.all([
    supabase
      .from('purchases')
      .select('id, reference, amount, currency, status, created_at, content:content_id(title, type), user:user_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('purchases')
      .select('amount')
      .eq('status', 'completed'),
  ])

  const purchases = ((purchasesRes.data ?? []) as unknown[]) as Array<{
    id: string; reference: string; amount: number; currency: string; status: string; created_at: string;
    content: { title: string; type: string } | null;
    user: { full_name: string | null; email: string } | null
  }>

  const totalRevenue = (revenueRes.data ?? []).reduce((sum, p) => sum + ((p as { amount: number }).amount ?? 0), 0)

  const STATUS_COLORS: Record<string, string> = {
    completed: '#15803d', pending: '#c2410c', failed: '#6b7280',
  }

  return (
    <div className="admin-main-inner">
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Payments</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total revenue', value: `₦${(totalRevenue / 100).toLocaleString('en-NG')}` },
          { label: 'Total transactions', value: purchases.length },
          { label: 'Successful', value: purchases.filter(p => p.status === 'completed').length },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{s.value}</div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              {['Reference', 'User', 'Content', 'Amount', 'Status', 'Date'].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {purchases.map(p => {
              const color = STATUS_COLORS[p.status] ?? '#374151'
              const amountDisplay = `${p.currency ?? 'NGN'} ${((p.amount ?? 0) / 100).toLocaleString('en-NG')}`
              return (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#6b7280', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.reference}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{p.user?.full_name ?? '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{p.user?.email ?? '—'}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem' }}>{p.content?.title ?? '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{p.content?.type ?? ''}</div>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{amountDisplay}</td>
                  <td><span style={{ display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: `${color}18`, color }}>{p.status}</span></td>
                  <td style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                    {new Date(p.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {purchases.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No transactions yet.</div>
        )}
      </div>
    </div>
  )
}
