import { webUrl } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import type { UserRow } from '@pshq/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'super_admin'].includes((p as UserRow).role)) redirect(`${webUrl()}/dashboard`)
}

// Epic H §H.10 — reuses the search_performed/search_zero_results events
// Build Prompt 3 already emits (confirmed firing in analytics_events).
// Zero-result searches get their own dedicated report per the prompt's
// explicit instruction: this is what tells JT what content to build next.
export default async function SearchAnalyticsPage() {
  await requireAdmin()
  const service = createServiceClient()

  const [performedRes, zeroRes] = await Promise.all([
    service.from('analytics_events').select('metadata, created_at').eq('event_name', 'search_performed').order('created_at', { ascending: false }).limit(500),
    service.from('analytics_events').select('metadata, created_at, user_id').eq('event_name', 'search_zero_results').order('created_at', { ascending: false }).limit(200),
  ])

  const performed = (performedRes.data ?? []) as Array<{ metadata: { query?: string; resultCount?: number } | null; created_at: string }>
  const zero = (zeroRes.data ?? []) as Array<{ metadata: { query?: string } | null; created_at: string; user_id: string | null }>

  const totalSearches = performed.length
  const zeroCount = zero.length
  const zeroResultRate = totalSearches > 0 ? Math.round((zeroCount / (totalSearches + zeroCount)) * 1000) / 10 : 0

  // Zero-result queries grouped by frequency — the actual content-gap signal.
  const zeroFreq = new Map<string, number>()
  for (const z of zero) {
    const q = (z.metadata?.query ?? '').trim().toLowerCase()
    if (q) zeroFreq.set(q, (zeroFreq.get(q) ?? 0) + 1)
  }
  const topZeroQueries = Array.from(zeroFreq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 30)

  const avgResults = totalSearches > 0
    ? Math.round((performed.reduce((sum, p) => sum + (p.metadata?.resultCount ?? 0), 0) / totalSearches) * 10) / 10
    : 0

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Search Analytics</h1>
          <p className="admin-page-subtitle">Real search_performed/search_zero_results events — the zero-result report below is the actual content-gap signal.</p>
        </div>
      </div>

      <div className="grid-collapse-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Searches (last 500)', value: totalSearches.toLocaleString() },
          { label: 'Zero-result rate', value: `${zeroResultRate}%` },
          { label: 'Avg. results per search', value: avgResults.toLocaleString() },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem' }}>{k.value}</p>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', margin: 0 }}>{k.label}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1rem', margin: '0 0 1rem' }}>Zero-result queries (what to build next)</h2>
      <div className="table-scroll">
        <table className="admin-table">
          <thead><tr><th>Query</th><th>Times searched with 0 results</th></tr></thead>
          <tbody>
            {topZeroQueries.length === 0 ? (
              <tr><td colSpan={2} className="table-empty">No zero-result searches recorded yet.</td></tr>
            ) : topZeroQueries.map(([q, count]) => (
              <tr key={q}><td>{q}</td><td className="td-num">{count}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
