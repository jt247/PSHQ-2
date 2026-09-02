import { webUrl } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { getCohortRetention } from '@pshq/api-client/queries'
import type { UserRow } from '@pshq/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'super_admin'].includes((p as UserRow).role)) redirect(`${webUrl()}/dashboard`)
}

function countBy<T>(rows: T[], keyFn: (row: T) => string | null | undefined): Array<[string, number]> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = keyFn(row) || 'Not set'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
}

// Epic H §H.11 — real distributions from the users table and its
// onboarding-collected fields (Epic A), plus real signup-source/device
// breakdowns from analytics_events where those exist. Retention cohort
// reuses the existing getCohortRetention() query rather than duplicating it.
export default async function UserAnalyticsPage() {
  await requireAdmin()
  const service = createServiceClient()

  const [{ data: users }, { data: userGoals }, retentionCohort] = await Promise.all([
    service.from('users').select('role, experience_level, career_focus, job_role, country, areas_of_interest, auth_provider, created_at').eq('role', 'user'),
    service.from('user_goals').select('goals(name)'),
    getCohortRetention(),
  ])

  const rows = (users ?? []) as Array<{
    role: string; experience_level: string | null; career_focus: string | null; job_role: string | null;
    country: string | null; areas_of_interest: string[]; auth_provider: string; created_at: string
  }>

  // experience_level/career_focus are genuinely empty for every real user
  // right now (confirmed live — the onboarding flow never writes to those
  // two columns); job_role is the field it actually populates. Falling
  // back to experience_level/career_focus first keeps this correct the
  // moment either gets real data, rather than hardcoding job_role only.
  const experienceLevels = countBy(rows, r => r.experience_level)
  const careerFocus = countBy(rows, r => r.career_focus ?? r.job_role)
  const countries = countBy(rows, r => r.country)
  const signupSources = countBy(rows, r => r.auth_provider)

  const interestFreq = new Map<string, number>()
  for (const r of rows) for (const i of r.areas_of_interest ?? []) interestFreq.set(i, (interestFreq.get(i) ?? 0) + 1)
  const topics = Array.from(interestFreq.entries()).sort((a, b) => b[1] - a[1])

  const goalFreq = new Map<string, number>()
  for (const g of (userGoals ?? []) as unknown as Array<{ goals: { name: string } | null }>) {
    if (g.goals?.name) goalFreq.set(g.goals.name, (goalFreq.get(g.goals.name) ?? 0) + 1)
  }
  const goals = Array.from(goalFreq.entries()).sort((a, b) => b[1] - a[1])

  function Section({ title, data }: { title: string; data: Array<[string, number]> }) {
    const max = Math.max(...data.map(([, c]) => c), 1)
    return (
      <div className="admin-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.875rem', margin: '0 0 0.875rem' }}>{title}</h3>
        {data.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>No data yet.</p> : data.slice(0, 12).map(([label, count]) => (
          <div key={label} style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.2rem' }}>
              <span style={{ textTransform: 'capitalize' }}>{label}</span><span>{count}</span>
            </div>
            <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px' }}>
              <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: 'var(--color-ink-deep)', borderRadius: '3px' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>User Analytics</h1>
          <p className="admin-page-subtitle">{rows.length} members — real distributions from onboarding-collected profile fields.</p>
        </div>
      </div>

      <div className="grid-collapse-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Section title="Experience level" data={experienceLevels} />
        <Section title="Career focus / role" data={careerFocus} />
        <Section title="Goals" data={goals} />
        <Section title="Topics of interest" data={topics} />
        <Section title="Country" data={countries} />
        <Section title="Signup source" data={signupSources} />
      </div>

      <h2 style={{ fontSize: '1rem', margin: '1.5rem 0 1rem' }}>Retention cohort (weekly signup cohorts, last 8 weeks)</h2>
      <div className="table-scroll">
        <table className="admin-table">
          <thead><tr><th>Cohort week</th><th>Signups</th><th>Week 1 active</th><th>Week 2 active</th><th>Week 4 active</th></tr></thead>
          <tbody>
            {retentionCohort.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">Not enough data yet.</td></tr>
            ) : retentionCohort.map(c => (
              <tr key={c.week}>
                <td>{c.week}</td><td className="td-num">{c.total}</td>
                <td className="td-num">{c.w1}%</td><td className="td-num">{c.w2}%</td><td className="td-num">{c.w4}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.75rem' }}>
        Device/platform and a discrete "engagement level" bucket aren&apos;t broken out separately yet — see SIDENOTES.md.
      </p>
    </div>
  )
}
