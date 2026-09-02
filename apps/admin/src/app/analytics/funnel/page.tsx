import { webUrl } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { createClient } from '@pshq/api-client/server'
import { getProductFunnel, getSupportingMetrics } from '@pshq/api-client/analytics'
import type { UserRow } from '@pshq/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'super_admin'].includes((p as UserRow).role)) redirect(`${webUrl()}/dashboard`)
}

// Epic H §H.5/§H.7 — the real product funnel and supporting metrics, all
// computed once in packages/api-client/src/analytics.ts. Every number here
// is a real query against analytics_events/content_progress/etc — nothing
// mocked. digestCtr is null (not a fabricated 0%) since the Weekly
// ProductSlice Digest is Epic J and hasn't shipped.
export default async function FunnelPage() {
  await requireAdmin()
  const [funnel, metrics] = await Promise.all([getProductFunnel(30), getSupportingMetrics()])

  const maxCount = Math.max(...funnel.map(f => f.count), 1)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Product Funnel</h1>
          <p className="admin-page-subtitle">Real counts and drop-off at every stage, last 30 days where applicable.</p>
        </div>
      </div>

      <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        {funnel.map((stage, i) => {
          const prev = i > 0 ? funnel[i - 1].count : null
          const dropoff = prev && prev > 0 ? Math.round(((prev - stage.count) / prev) * 100) : null
          return (
            <div key={stage.label} style={{ marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827' }}>{stage.label}</span>
                <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                  {stage.count.toLocaleString()}{dropoff !== null && dropoff > 0 ? ` (−${dropoff}%)` : ''}
                </span>
              </div>
              <div style={{ height: '10px', background: '#f3f4f6', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(stage.count / maxCount) * 100}%`, background: 'var(--color-ink-deep)', borderRadius: '5px' }} />
              </div>
            </div>
          )
        })}
      </div>

      <h2 style={{ fontSize: '1rem', margin: '1.5rem 0 1rem' }}>Supporting metrics (§H.7)</h2>
      <div className="table-scroll">
        <table className="admin-table">
          <tbody>
            {[
              ['Signup conversion', `${metrics.signupConversion}%`],
              ['Email verification rate', `${metrics.emailVerificationRate}%`],
              ['Onboarding completion', `${metrics.onboardingCompletionRate}%`],
              ['Activation rate', `${metrics.activationRate}%`],
              ['Day 1 return', `${metrics.day1Return}%`],
              ['Day 7 retention', `${metrics.day7Retention}%`],
              ['Day 30 retention', `${metrics.day30Retention}%`],
              ['WAU', metrics.wau.toLocaleString()],
              ['MAU', metrics.mau.toLocaleString()],
              ['WAU/MAU', metrics.wauOverMau.toFixed(2)],
              ['Resource completion rate', `${metrics.resourceCompletionRate}%`],
              ['Save rate', `${metrics.saveRate}%`],
              ['Download rate', `${metrics.downloadRate}%`],
              ['Learning path starts', metrics.learningPathStartCount.toLocaleString()],
              ['Learning path completion rate', `${metrics.learningPathCompletionRate}%`],
              ['Exercise completions', metrics.exerciseCompletionCount.toLocaleString()],
              ['Recommendation CTR', `${metrics.recommendationCtr}%`],
              ['AI feature usage', metrics.aiFeatureUsageCount.toLocaleString()],
              ['Community contributions', metrics.communityContributionCount.toLocaleString()],
              ['Digest CTR', metrics.digestCtr === null ? 'Not yet applicable (Epic J)' : `${metrics.digestCtr}%`],
            ].map(([label, value]) => (
              <tr key={label}>
                <td style={{ fontWeight: 600, color: '#111827' }}>{label}</td>
                <td style={{ color: label === 'Digest CTR' ? '#9ca3af' : '#374151', fontStyle: label === 'Digest CTR' ? 'italic' : 'normal' }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
