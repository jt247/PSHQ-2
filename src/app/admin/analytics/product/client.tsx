'use client'

import Link from 'next/link'
import { PieStyleBar } from '@/components/analytics/Charts'

interface Props {
  data: {
    days: number
    community: {
      totalMembers: number
      activeMembers7d: number
      newMembers: number
      selarClicks30d: number
      engagementRate: number
      returningMemberRate: number
    }
    engagement: {
      activationRate: number
      avgDepth: number
      engagedUserPct: number
      aiSummaryRate: number
    }
    content: {
      topViewed: Array<{ title: string; type: string; count: number }>
      topUnlocked: Array<{ title: string; type: string; count: number }>
      typeBreakdown: Array<{ type: string; count: number }>
      mostDiscussed: Array<{ title: string; type: string; comment_count: number; upvote_count: number; discussion_score: number }>
      topSelarClicks: Array<{ title: string; type: string; count: number }>
    }
  }
}

const DAY_OPTIONS = [7, 14, 30, 90] as const
const pct = (n: number) => `${n}%`

export function ProductClient({ data }: Props) {
  const { days, community, engagement, content } = data
  const typeRows = content.typeBreakdown.map(t => ({ label: t.type, value: t.count }))

  return (
    <div style={page}>
      <div style={titleRow}>
        <div>
          <h1 style={h1}>Community Health Overview</h1>
          <p style={sub}>Member engagement, content consumption, and community signals.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {DAY_OPTIONS.map(d => (
            <Link key={d} href={`/admin/analytics/product?days=${d}`} style={pill(days === d)}>{d}d</Link>
          ))}
        </div>
      </div>

      {/* Community Health */}
      <Section title="Community health">
        <div style={grid3Col}>
          <StatCard label="Total members" value={community.totalMembers.toLocaleString()} />
          <StatCard label="Active members (7d)" value={community.activeMembers7d.toLocaleString()} />
          <StatCard label={`New members (${days}d)`} value={community.newMembers.toLocaleString()} />
          <StatCard label={`Selar clicks (${days}d)`} value={community.selarClicks30d.toLocaleString()} note="Interest signal for paid resources" />
          <StatCard label="Engagement rate" value={pct(community.engagementRate)} note="Engaged members / active members" />
          <StatCard label="Returning member rate" value={pct(community.returningMemberRate)} note="Active across 2+ weeks" />
        </div>
      </Section>

      {/* Engagement Depth */}
      <Section title="Engagement depth">
        <div style={grid2Col}>
          <MetricRow label="Activation rate (signup → first unlock)" value={pct(engagement.activationRate)} />
          <MetricRow label="Avg content interactions per active member" value={String(engagement.avgDepth)} />
          <MetricRow label="Engaged members (3+ interactions)" value={pct(engagement.engagedUserPct)} />
          <MetricRow label="AI summary usage rate (summaries / views)" value={pct(engagement.aiSummaryRate)} />
        </div>
      </Section>

      {/* Content Performance */}
      <Section title="Content performance">
        <div style={grid2}>
          <div>
            <h4 style={sub2}>Most viewed</h4>
            <ContentRankList items={content.topViewed} metric="views" />
          </div>
          <div>
            <h4 style={sub2}>Most unlocked</h4>
            <ContentRankList items={content.topUnlocked} metric="unlocks" />
          </div>
        </div>
        <div style={{ ...grid2, marginTop: '1rem' }}>
          <div>
            <h4 style={sub2}>Most discussed (comments + upvotes)</h4>
            {content.mostDiscussed.length === 0
              ? <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No discussions yet.</p>
              : content.mostDiscussed.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', borderBottom: '1px solid #f9fafb' }}>
                  <span style={{ color: '#d1d5db', fontSize: '0.75rem', width: '0.875rem' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '0.8125rem', color: '#111827', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', flexShrink: 0 }}>💬 {c.comment_count} · ↑ {c.upvote_count}</span>
                </div>
              ))
            }
          </div>
          <div>
            <h4 style={sub2}>Content by type</h4>
            <PieStyleBar data={typeRows} />
          </div>
        </div>
      </Section>

      {/* Selar Interest Signals */}
      <Section title="Selar interest signals">
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 0.875rem' }}>
          Click-throughs to Selar listings — not revenue, just interest. Helps prioritise which paid resources resonate with the community.
        </p>
        {content.topSelarClicks.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No Selar clicks recorded yet.</p>
        ) : (
          <ContentRankList items={content.topSelarClicks} metric="clicks" />
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
    <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{value}</div>
      <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.2rem' }}>{label}</div>
      {note && <div style={{ fontSize: '0.75rem', color: '#d1d5db', marginTop: '0.125rem' }}>{note}</div>}
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontSize: '0.875rem', color: '#374151' }}>{label}</span>
      <span style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{value}</span>
    </div>
  )
}

function ContentRankList({ items, metric }: { items: Array<{ title: string; type: string; count: number }>; metric: string }) {
  if (!items.length) return <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No data yet.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', borderBottom: '1px solid #f9fafb' }}>
          <span style={{ color: '#d1d5db', fontSize: '0.75rem', width: '0.875rem' }}>{i + 1}</span>
          <span style={{ flex: 1, fontSize: '0.8125rem', color: '#111827', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
          <span style={{ fontSize: '0.75rem', color: '#6b7280', flexShrink: 0 }}>{item.count} {metric}</span>
        </div>
      ))}
    </div>
  )
}

const pill = (active: boolean): React.CSSProperties => ({
  padding: '0.25rem 0.625rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 500,
  textDecoration: 'none', background: active ? '#111827' : '#f3f4f6', color: active ? '#fff' : '#374151',
})
const page: React.CSSProperties = { maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: '1.25rem' }
const h1: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }
const sub: React.CSSProperties = { color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }
const sub2: React.CSSProperties = { fontSize: '0.8125rem', fontWeight: 600, color: '#374151', margin: '0 0 0.625rem', textTransform: 'uppercase', letterSpacing: '0.04em' }
const titleRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }
const grid3Col: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }
const grid2Col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0' }
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }
