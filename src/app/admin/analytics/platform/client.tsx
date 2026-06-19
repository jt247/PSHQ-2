'use client'

import Link from 'next/link'
import { TinyLineChart, TinyBarChart, FunnelChart, PieStyleBar } from '@/components/analytics/Charts'

interface Props {
  data: {
    days: number
    dailyViews: Array<{ day: string; count: number }>
    dailySignups: Array<{ day: string; count: number }>
    interactionTypes: Record<string, number>
    topViewed: Array<{ title: string; type: string; slug: string; count: number }>
    topUnlocked: Array<{ title: string; type: string; slug: string; count: number }>
    metrics: {
      totalViews: number
      uniqueVisitors: number
      newUsers: number
      returningUsers: number
      returningPct: number
    }
    funnel: Array<{ label: string; value: number }>
  }
}

const DAY_OPTIONS = [7, 14, 30, 90] as const

export function PlatformClient({ data }: Props) {
  const { days, dailyViews, dailySignups, interactionTypes, topViewed, topUnlocked, metrics, funnel } = data

  const interactionRows = Object.entries(interactionTypes)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }))

  return (
    <div style={page}>
      <div style={titleRow}>
        <div>
          <h1 style={h1}>Platform Analytics</h1>
          <p style={sub}>Traffic, engagement, and funnel metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {DAY_OPTIONS.map(d => (
            <Link key={d} href={`/admin/analytics/platform?days=${d}`} style={pill(days === d)}>
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {/* Overview stats */}
      <div style={grid4}>
        <StatCard label="Total visits" value={metrics.totalViews.toLocaleString()} />
        <StatCard label="Unique visitors" value={metrics.uniqueVisitors.toLocaleString()} note="(session estimate)" />
        <StatCard label="New signups" value={metrics.newUsers.toLocaleString()} />
        <StatCard label="Returning users" value={`${metrics.returningPct}%`} note={`${metrics.returningUsers} users`} />
      </div>

      {/* Charts */}
      <div style={grid2}>
        <div style={card}>
          <h3 style={cardTitle}>Daily views</h3>
          <TinyLineChart data={dailyViews} color="#6366f1" />
        </div>
        <div style={card}>
          <h3 style={cardTitle}>Daily signups</h3>
          <TinyBarChart data={dailySignups} color="#10b981" />
        </div>
      </div>

      {/* Funnel + Interaction breakdown */}
      <div style={grid2}>
        <div style={card}>
          <h3 style={cardTitle}>Conversion funnel</h3>
          <p style={cardNote}>Visit → Signup → Unlock → Purchase</p>
          <FunnelChart steps={funnel} />
        </div>
        <div style={card}>
          <h3 style={cardTitle}>Interaction breakdown</h3>
          <p style={cardNote}>All interaction types in period</p>
          <PieStyleBar data={interactionRows} />
        </div>
      </div>

      {/* Top content */}
      <div style={grid2}>
        <div style={card}>
          <h3 style={cardTitle}>Most visited content</h3>
          <ContentList items={topViewed} />
        </div>
        <div style={card}>
          <h3 style={cardTitle}>Most unlocked content</h3>
          <ContentList items={topUnlocked} />
        </div>
      </div>

      {/* Retention note */}
      <div style={{ ...card, background: '#f9fafb' }}>
        <h3 style={cardTitle}>Retention</h3>
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: '#374151' }}>Returning rate: {metrics.returningPct}%</strong> of logged-in users who interacted at least once
          came back in this {days}-day window.
          For session-based retention curves (1d/7d/30d), connect a PostHog project and use the Retention
          insight — PostHog tracks anonymous sessions across visits more reliably than Supabase interactions alone.
        </p>
      </div>

      {/* PostHog note */}
      <div style={{ padding: '1rem 1.25rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '0.8125rem', color: '#92400e' }}>
        <strong>PostHog:</strong> Traffic, session duration, pages/session, device breakdown, and UTM source data
        are available in your PostHog project. This dashboard surfaces Supabase-native engagement metrics.
        Connect the PostHog Insights embed or iframe for full traffic analytics once NEXT_PUBLIC_POSTHOG_KEY is configured.
      </div>
    </div>
  )
}

function ContentList({ items }: { items: Array<{ title: string; type: string; count: number }> }) {
  if (!items.length) return <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No data yet.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #f9fafb' }}>
          <span style={{ color: '#d1d5db', fontSize: '0.8125rem', width: '1rem', flexShrink: 0 }}>{i + 1}</span>
          <span style={{ flex: 1, fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>{item.title}</span>
          <span style={typeBadge(item.type)}>{item.type}</span>
          <span style={{ fontSize: '0.8125rem', color: '#9ca3af', minWidth: '3rem', textAlign: 'right' }}>{item.count}</span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827' }}>{value}</div>
      <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>{label}</div>
      {note && <div style={{ fontSize: '0.75rem', color: '#d1d5db', marginTop: '0.125rem' }}>{note}</div>}
    </div>
  )
}

const TYPE_COLORS: Record<string, string> = { article: '#dbeafe', ebook: '#fce7f3', template: '#dcfce7', course: '#fef3c7' }
const TYPE_TEXT: Record<string, string> = { article: '#1e40af', ebook: '#be185d', template: '#15803d', course: '#b45309' }
const typeBadge = (type: string): React.CSSProperties => ({
  display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: '9999px',
  fontSize: '0.7rem', fontWeight: 600,
  background: TYPE_COLORS[type] ?? '#f3f4f6',
  color: TYPE_TEXT[type] ?? '#374151',
})
const pill = (active: boolean): React.CSSProperties => ({
  padding: '0.25rem 0.625rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 500,
  textDecoration: 'none', background: active ? '#111827' : '#f3f4f6', color: active ? '#fff' : '#374151',
})
const page: React.CSSProperties = { maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: '1.25rem' }
const h1: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }
const sub: React.CSSProperties = { color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }
const titleRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }
const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem 1.5rem' }
const cardTitle: React.CSSProperties = { fontSize: '0.9375rem', fontWeight: 600, color: '#111827', margin: '0 0 0.25rem' }
const cardNote: React.CSSProperties = { fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 0.75rem' }
