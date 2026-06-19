'use client'

import Link from 'next/link'
import { PieStyleBar, HorizontalBarChart } from '@/components/analytics/Charts'

interface RevenueIntel {
  avgOrderValue: number
  repeatBuyerPct: number
  byCountry: Array<[string, number]>
  byRole: Array<[string, number]>
  topContent: Array<{ title: string; type: string; revenue: number; count: number }>
}

interface Props {
  data: {
    days: number
    isSuperAdmin: boolean
    business: {
      totalUsers: number; activeUsers7d: number; newUsers: number
      totalRevenue: number; windowRevenue: number; conversionRate: number; arpu: number
    }
    growth: { activationRate: number; purchaseRate: number; repeatBuyerPct: number }
    content: {
      topViewed: Array<{ title: string; type: string; count: number }>
      topUnlocked: Array<{ title: string; type: string; count: number }>
      topPurchased: Array<{ title: string; type: string; count: number }>
      typeBreakdown: Array<{ type: string; count: number }>
    }
    userBehavior: { avgInteractionsPerUser: number; engagedUserPct: number; avgOrderValue: number }
    revenueIntel: RevenueIntel | null
  }
}

const DAY_OPTIONS = [7, 14, 30, 90] as const
const fmt = (n: number) => `₦${n.toLocaleString('en-NG')}`
const pct = (n: number) => `${n}%`

export function ProductClient({ data }: Props) {
  const { days, isSuperAdmin, business, growth, content, userBehavior, revenueIntel } = data

  const typeRows = content.typeBreakdown.map(t => ({ label: t.type, value: t.count }))

  return (
    <div style={page}>
      <div style={titleRow}>
        <div>
          <h1 style={h1}>Product Analytics</h1>
          <p style={sub}>Revenue, content performance, and user behavior.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {DAY_OPTIONS.map(d => (
            <Link key={d} href={`/admin/analytics/product?days=${d}`} style={pill(days === d)}>{d}d</Link>
          ))}
        </div>
      </div>

      {/* Business Overview */}
      <Section title="Business overview">
        <div style={grid4}>
          <StatCard label="Total users" value={business.totalUsers.toLocaleString()} />
          <StatCard label="Active users (7d)" value={business.activeUsers7d.toLocaleString()} />
          <StatCard label={`New users (${days}d)`} value={business.newUsers.toLocaleString()} />
          <StatCard label="Total revenue" value={fmt(Math.round(business.totalRevenue / 100))} />
          <StatCard label={`Revenue (${days}d)`} value={fmt(Math.round(business.windowRevenue / 100))} />
          <StatCard label="Purchase conversion" value={pct(business.conversionRate)} />
          <StatCard label="ARPU" value={fmt(business.arpu)} note="all-time" />
        </div>
      </Section>

      {/* Growth Metrics */}
      <Section title="Growth metrics">
        <div style={grid3}>
          <MetricRow label="Activation rate (signup → first unlock)" value={pct(growth.activationRate)} />
          <MetricRow label="Purchase rate (signup → purchase)" value={pct(growth.purchaseRate)} />
          <MetricRow label="Repeat buyer rate" value={pct(growth.repeatBuyerPct)} />
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
            <h4 style={sub2}>Most purchased</h4>
            <ContentRankList items={content.topPurchased} metric="purchases" />
          </div>
          <div>
            <h4 style={sub2}>Content by type</h4>
            <PieStyleBar data={typeRows} />
          </div>
        </div>
      </Section>

      {/* User Behavior */}
      <Section title="User behavior">
        <div style={grid3}>
          <MetricRow label="Avg interactions / user" value={String(userBehavior.avgInteractionsPerUser)} />
          <MetricRow label="Engaged users (3+ interactions)" value={pct(userBehavior.engagedUserPct)} />
          <MetricRow label="Avg order value" value={fmt(userBehavior.avgOrderValue)} />
        </div>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.75rem 0 0' }}>
          Engaged threshold: 3+ interactions in the selected period. Adjust in <code>queries.ts</code>.
        </p>
      </Section>

      {/* Revenue Intelligence — super_admin only */}
      {isSuperAdmin && revenueIntel ? (
        <Section title="Revenue intelligence" badge="super_admin">
          <div style={grid2}>
            <div>
              <h4 style={sub2}>Revenue by country</h4>
              <PieStyleBar data={revenueIntel.byCountry.map(([label, value]) => ({ label, value: Math.round(value / 100) }))} valueFormat={v => fmt(v)} />
            </div>
            <div>
              <h4 style={sub2}>Revenue by job role</h4>
              <PieStyleBar data={revenueIntel.byRole.map(([label, value]) => ({ label, value: Math.round(value / 100) }))} valueFormat={v => fmt(v)} />
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <h4 style={sub2}>Top revenue content</h4>
            {revenueIntel.topContent.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No completed purchases yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {revenueIntel.topContent.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #f9fafb' }}>
                    <span style={{ color: '#d1d5db', fontSize: '0.8125rem', width: '1rem' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>{c.title}</span>
                    <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>{c.count} sales</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{fmt(Math.round(c.revenue / 100))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      ) : !isSuperAdmin ? (
        <div style={{ padding: '1.25rem', background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '10px', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
            Revenue Intelligence is visible to super_admins only.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827', margin: 0 }}>{title}</h2>
        {badge && <span style={{ padding: '0.1rem 0.4rem', background: '#fef3c7', color: '#b45309', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>{badge}</span>}
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{value}</div>
      <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.2rem' }}>{label}</div>
      {note && <div style={{ fontSize: '0.75rem', color: '#d1d5db' }}>{note}</div>}
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
const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }
const grid3: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0' }
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }
