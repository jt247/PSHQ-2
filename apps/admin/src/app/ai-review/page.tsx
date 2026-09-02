import { webUrl } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import type { UserRow } from '@pshq/database'

interface PageProps { searchParams: Promise<{ feature?: string; validation?: string }> }

const FEATURES = ['learning_path', 'recommendation', 'continue_from_here', 'content_assistance']

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// Epic G Step 11 — closes the AI interaction review gap Epic E (Build
// Prompt 6) explicitly deferred: a simple spot-check view over
// ai_interactions, filterable by feature and validation result, so JT can
// see what the grounding layer is actually producing without querying
// Supabase directly.
export default async function AiReviewPage({ searchParams }: PageProps) {
  const { feature, validation } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'super_admin'].includes((p as UserRow).role)) redirect(`${webUrl()}/dashboard`)

  const service = createServiceClient()
  let query = service
    .from('ai_interactions')
    .select('id, feature, input_context, retrieved_content_ids, rejected_ids, validation_passed, model_used, created_at, user:user_id(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(150)

  if (feature) query = query.eq('feature', feature)
  if (validation === 'passed') query = query.eq('validation_passed', true)
  if (validation === 'failed') query = query.eq('validation_passed', false)

  const { data } = await query
  const rows = (data ?? []) as unknown as Array<{
    id: string; feature: string; input_context: Record<string, unknown>;
    retrieved_content_ids: string[]; rejected_ids: string[]; validation_passed: boolean;
    model_used: string | null; created_at: string; user: { full_name: string | null; email: string } | null
  }>

  function href(params: Record<string, string | undefined>) {
    const q = Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&')
    return q ? `?${q}` : '/ai-review'
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>AI Interaction Review</h1>
          <p className="admin-page-subtitle">{rows.length} recent interactions — spot-check what the grounding layer produces.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <a href={href({ validation })} className="filter-btn">All features</a>
        {FEATURES.map(f => <a key={f} href={href({ feature: f, validation })} className="filter-btn">{f.replace(/_/g, ' ')}</a>)}
      </div>
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <a href={href({ feature })} className="filter-btn">Any result</a>
        <a href={href({ feature, validation: 'passed' })} className="filter-btn">Passed</a>
        <a href={href({ feature, validation: 'failed' })} className="filter-btn">Failed validation</a>
      </div>

      <div className="table-scroll">
        <table className="admin-table">
          <thead><tr><th>User</th><th>Feature</th><th>Retrieved</th><th>Rejected</th><th>Model</th><th>Result</th><th>When</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">No AI interactions logged yet.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <td>{r.user?.full_name ?? r.user?.email ?? 'Anonymous'}</td>
                <td style={{ textTransform: 'capitalize' }}>{r.feature.replace(/_/g, ' ')}</td>
                <td className="td-num">{r.retrieved_content_ids?.length ?? 0}</td>
                <td className="td-num">{r.rejected_ids?.length ?? 0}</td>
                <td style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{r.model_used ?? '—'}</td>
                <td><span className={`badge badge-${r.validation_passed ? 'green' : 'red'}`}>{r.validation_passed ? 'Passed' : 'Failed'}</span></td>
                <td style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{timeAgo(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
