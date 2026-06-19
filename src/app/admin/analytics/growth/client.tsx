'use client'

import Link from 'next/link'
import { TinyBarChart, PieStyleBar } from '@/components/analytics/Charts'

interface CohortRow {
  week: string
  total: number
  w1: number
  w2: number
  w4: number
}

interface Props {
  data: {
    days: number
    dailySignups: Array<{ day: string; count: number }>
    breakdown: {
      byCountry: Array<[string, number]>
      byRole: Array<[string, number]>
    }
    activation: {
      totalNewUsers: number
      activated24h: number
      activated7d: number
      rate24h: number
      rate7d: number
    }
    cohorts: CohortRow[]
    segments: {
      total: number; power: number; casual: number; dormant: number
      powerThreshold: number; casualThreshold: number
    }
    contentLedTracked: boolean
  }
}

const DAY_OPTIONS = [7, 14, 30, 90] as const

export function GrowthClient({ data }: Props) {
  const { days, dailySignups, breakdown, activation, cohorts, segments, contentLedTracked } = data

  const countryRows = breakdown.byCountry.map(([label, value]) => ({ label, value }))
  const roleRows = breakdown.byRole.map(([label, value]) => ({ label, value }))

  const segmentRows = [
    { label: `Power (${segments.powerThreshold}+ interactions/30d)`, value: segments.power },
    { label: `Casual (${segments.casualThreshold}–${segments.powerThreshold - 1})`, value: segments.casual },
    { label: 'Dormant (0 interactions/30d)', value: segments.dormant },
  ]

  return (
    <div style={page}>
      <div style={titleRow}>
        <div>
          <h1 style={h1}>Growth Analytics</h1>
          <p style={sub}>Acquisition, activation, cohort retention, and engagement segments.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {DAY_OPTIONS.map(d => (
            <Link key={d} href={`/admin/analytics/growth?days=${d}`} style={pill(days === d)}>{d}d</Link>
          ))}
        </div>
      </div>

      {/* Acquisition */}
      <Section title="Acquisition">
        <div style={grid2}>
          <div>
            <h4 style={sub2}>Signups over time</h4>
            <TinyBarChart data={dailySignups} color="#6366f1" />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <StatCard label={`New signups (${days}d)`} value={dailySignups.reduce((s, d) => s + d.count, 0).toLocaleString()} />
          </div>
        </div>
        <div style={{ ...grid2, marginTop: '1rem' }}>
          <div>
            <h4 style={sub2}>Signups by country</h4>
            {countryRows.length > 0
              ? <PieStyleBar data={countryRows} />
              : <Empty text="No country data yet — complete onboarding to populate." />}
          </div>
          <div>
            <h4 style={sub2}>Signups by job role</h4>
            {roleRows.length > 0
              ? <PieStyleBar data={roleRows} />
              : <Empty text="No job role data yet — complete onboarding to populate." />}
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#f9fafb', borderRadius: '6px', fontSize: '0.8125rem', color: '#6b7280' }}>
          <strong style={{ color: '#374151' }}>Signup source (UTM/referrer):</strong> Not yet tracked at the Supabase level.
          Use PostHog's Acquisition insight to see direct vs referral vs social breakdowns
          once NEXT_PUBLIC_POSTHOG_KEY is configured.
        </div>
      </Section>

      {/* Activation funnel */}
      <Section title="Activation funnel">
        <div style={grid3}>
          <StatCard label={`New signups (${days}d)`} value={String(activation.totalNewUsers)} />
          <StatCard label="Activated within 24h" value={`${activation.rate24h}%`} note={`${activation.activated24h} users`} />
          <StatCard label="Activated within 7d" value={`${activation.rate7d}%`} note={`${activation.activated7d} users`} />
        </div>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.75rem 0 0' }}>
          Activation = first content unlock after signup.
        </p>
      </Section>

      {/* Cohort retention */}
      <Section title="Cohort retention">
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 0.75rem' }}>
          Users grouped by signup week. Columns show % still active in weeks 1, 2, and 4 post-signup.
        </p>
        {cohorts.length === 0 ? (
          <Empty text="Not enough historical data yet. Run the seed migration and wait for signups." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {['Cohort week', 'Users', 'Week 1 %', 'Week 2 %', 'Week 4 %'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map(c => (
                  <tr key={c.week}>
                    <td style={td}>{c.week}</td>
                    <td style={td}>{c.total}</td>
                    <td style={td}><PctCell value={c.w1} /></td>
                    <td style={td}><PctCell value={c.w2} /></td>
                    <td style={td}><PctCell value={c.w4} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Engagement segments */}
      <Section title="Engagement segments">
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 0.75rem' }}>
          Based on interaction count over the last 30 days.{' '}
          <strong>Thresholds are adjustable</strong> in <code>src/app/admin/analytics/growth/page.tsx</code>{' '}
          (currently: power ≥ {segments.powerThreshold} interactions, casual ≥ {segments.casualThreshold}).
        </p>
        <div style={grid2}>
          <PieStyleBar data={segmentRows} />
          <div style={grid3}>
            <StatCard label="Total users" value={segments.total.toLocaleString()} />
            <StatCard label="Power users" value={segments.power.toLocaleString()} note={`≥ ${segments.powerThreshold} interactions/30d`} />
            <StatCard label="Dormant" value={segments.dormant.toLocaleString()} note="0 interactions/30d" />
          </div>
        </div>
      </Section>

      {/* Content-led growth */}
      <Section title="Content-led growth">
        {contentLedTracked ? (
          <p style={{ fontSize: '0.875rem', color: '#374151' }}>Content attribution data available.</p>
        ) : (
          <div style={{ padding: '1rem', background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0 0 0.5rem', fontWeight: 500 }}>
              Not yet tracked — here&apos;s how to enable it:
            </p>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.7 }}>
              <li>Add <code>last_content_viewed_before_signup text</code> column to the <code>users</code> table.</li>
              <li>On public content pages (<code>/articles/[slug]</code>, <code>/content/[slug]</code>), write the content slug
                to a first-party cookie (<code>pshq_last_content</code>) for anonymous visitors.</li>
              <li>In the sign-up server action, read <code>pshq_last_content</code> from the request cookies and store it on the newly
                created <code>users</code> row.</li>
              <li>Clear the cookie on write. This dashboard will then show which content pieces precede signups.</li>
            </ol>
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
      <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827', margin: '0 0 1rem' }}>{title}</h2>
      {children}
    </div>
  )
}

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '0.875rem 1rem' }}>
      <div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#111827' }}>{value}</div>
      <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.2rem' }}>{label}</div>
      {note && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.1rem' }}>{note}</div>}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>{text}</p>
}

function PctCell({ value }: { value: number }) {
  const bg = value >= 50 ? '#dcfce7' : value >= 25 ? '#fef9c3' : value > 0 ? '#fee2e2' : '#f9fafb'
  const color = value >= 50 ? '#15803d' : value >= 25 ? '#a16207' : value > 0 ? '#b91c1c' : '#9ca3af'
  return (
    <span style={{ display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '4px', background: bg, color, fontWeight: 600, fontSize: '0.8125rem' }}>
      {value > 0 ? `${value}%` : '—'}
    </span>
  )
}

const pill = (active: boolean): React.CSSProperties => ({
  padding: '0.25rem 0.625rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 500,
  textDecoration: 'none', background: active ? '#111827' : '#f3f4f6', color: active ? '#fff' : '#374151',
})
const page: React.CSSProperties = { maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: '1.25rem' }
const h1: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }
const sub: React.CSSProperties = { color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }
const sub2: React.CSSProperties = { fontSize: '0.8125rem', fontWeight: 600, color: '#374151', margin: '0 0 0.625rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const titleRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }
const grid3: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.5rem' }
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }
const th: React.CSSProperties = { padding: '0.5rem 0.875rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.04em', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }
const td: React.CSSProperties = { padding: '0.625rem 0.875rem', borderBottom: '1px solid #f3f4f6', color: '#374151' }
