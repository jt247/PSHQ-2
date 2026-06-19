'use client'

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const GRID = '#f3f4f6'
const AXIS = '#9ca3af'
const BLUE = '#6366f1'
const GREEN = '#10b981'
const ORANGE = '#f59e0b'
const COLORS = [BLUE, GREEN, ORANGE, '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

interface DaySeries { day: string; count: number }

export function TinyLineChart({ data, color = BLUE }: { data: DaySeries[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: AXIS }}
          tickFormatter={d => d.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 10, fill: AXIS }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
          formatter={(v) => [v, 'Count']}
          labelFormatter={l => `Date: ${l}`}
        />
        <Line type="monotone" dataKey="count" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function TinyBarChart({ data, color = BLUE }: { data: DaySeries[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: AXIS }}
          tickFormatter={d => d.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 10, fill: AXIS }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }} />
        <Bar dataKey="count" fill={color} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface LabelValue { label: string; value: number }

export function HorizontalBarChart({ data, valueFormat = (v: number) => String(v) }: { data: LabelValue[]; valueFormat?: (v: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 60, bottom: 0, left: 80 }}>
        <XAxis type="number" tick={{ fontSize: 10, fill: AXIS }} allowDecimals={false} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#374151' }} width={80} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
          formatter={(v) => [valueFormat(Number(v)), '']}
        />
        <Bar dataKey="value" radius={[0, 2, 2, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function PieStyleBar({ data, valueFormat }: { data: LabelValue[]; valueFormat?: (v: number) => string }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {data.map((d, i) => {
        const pct = total > 0 ? Math.round(d.value / total * 100) : 0
        const displayValue = valueFormat ? valueFormat(d.value) : d.value.toLocaleString()
        return (
          <div key={d.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.2rem' }}>
              <span style={{ color: '#374151' }}>{d.label}</span>
              <span style={{ color: '#6b7280' }}>{displayValue} ({pct}%)</span>
            </div>
            <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: '9999px' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function FunnelChart({ steps }: { steps: Array<{ label: string; value: number }> }) {
  const max = steps[0]?.value || 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {steps.map((step, i) => {
        const pct = Math.round(step.value / max * 100)
        const convPct = i > 0 && steps[i - 1].value > 0
          ? Math.round(step.value / steps[i - 1].value * 100)
          : null
        return (
          <div key={step.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
              <span style={{ color: '#374151', fontWeight: 500 }}>{step.label}</span>
              <span style={{ color: '#6b7280' }}>
                {step.value.toLocaleString()}
                {convPct !== null && <span style={{ color: '#9ca3af', marginLeft: '0.5rem' }}>↓ {convPct}%</span>}
              </span>
            </div>
            <div style={{ height: '28px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i], borderRadius: '4px', transition: 'width 0.3s' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
