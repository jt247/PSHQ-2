import { webUrl } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { getContentRatesTable } from '@pshq/api-client/analytics'
import type { UserRow } from '@pshq/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'super_admin'].includes((p as UserRow).role)) redirect(`${webUrl()}/dashboard`)
}

// Epic H §H.9 — real per-content analytics, one shared calculation
// (getContentRatesTable) sorted by unique opens. Every column is a real
// count or a real rate derived from real counts.
export default async function ContentAnalyticsPage() {
  await requireAdmin()
  const service = createServiceClient()

  const [rates, contentRes] = await Promise.all([
    getContentRatesTable(),
    service.from('content').select('id, title, type').eq('status', 'published'),
  ])

  const titleById = new Map((contentRes.data ?? []).map(c => [c.id, { title: c.title, type: c.type }]))
  const rows = rates
    .map(r => ({ ...r, title: titleById.get(r.contentId)?.title ?? 'Untitled', type: titleById.get(r.contentId)?.type ?? '' }))
    .sort((a, b) => b.uniqueOpens - a.uniqueOpens)
    .slice(0, 100)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Content Analytics</h1>
          <p className="admin-page-subtitle">Per-item impressions, opens, completion, save/download/share rates, ratings, and AI/listen/related activity — top 100 by unique opens.</p>
        </div>
      </div>

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th><th>Type</th><th>Impr.</th><th>Unique opens</th><th>Reader opens</th>
              <th>Read rate</th><th>Completions</th><th>Compl. rate</th><th>Favorites</th><th>Save rate</th>
              <th>Downloads</th><th>DL rate</th><th>Shares</th><th>Share rate</th><th>Comments</th>
              <th>Rating</th><th>AI</th><th>Listen</th><th>Related clicks</th><th>Engagement rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={20} className="table-empty">No content analytics yet.</td></tr>
            ) : rows.map(r => (
              <tr key={r.contentId}>
                <td className="td-title">{r.title}</td>
                <td style={{ textTransform: 'capitalize' }}>{r.type}</td>
                <td className="td-num">{r.impressions}</td>
                <td className="td-num">{r.uniqueOpens}</td>
                <td className="td-num">{r.readerOpens}</td>
                <td className="td-num">{r.readRate}%</td>
                <td className="td-num">{r.completions}</td>
                <td className="td-num">{r.completionRate}%</td>
                <td className="td-num">{r.favorites}</td>
                <td className="td-num">{r.saveRate}%</td>
                <td className="td-num">{r.downloads}</td>
                <td className="td-num">{r.downloadRate}%</td>
                <td className="td-num">{r.shares}</td>
                <td className="td-num">{r.shareRate}%</td>
                <td className="td-num">{r.comments}</td>
                <td className="td-num">{r.averageRating ?? '—'}{r.ratingsCount > 0 ? ` (${r.ratingsCount})` : ''}</td>
                <td className="td-num">{r.aiInteractions}</td>
                <td className="td-num">{r.listenStarts}/{r.listenCompletions}</td>
                <td className="td-num">{r.relatedClicks}</td>
                <td className="td-num">{r.engagementRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
