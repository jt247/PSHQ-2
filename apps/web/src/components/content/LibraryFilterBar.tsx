'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Option { value: string; label: string }

interface Props {
  initial: Record<string, string>
  search: string
  typeOptions: Option[]
  domainOptions: Option[]
  levelOptions: Option[]
  intentOptions: Option[]
  timeOptions: Option[]
  topicOptions: Option[]
  roleOptions: Option[]
  goalOptions: Option[]
  seriesOptions: Option[]
  sortOptions: Option[]
  resultCount: number
}

const FIELD_KEYS = ['type', 'domain', 'level', 'intent', 'time', 'topic', 'role', 'goal', 'series', 'sort'] as const

// Two-row LinkedIn-style filter bar: pick across every dropdown first,
// nothing re-fetches until Apply — one navigation for a whole batch of
// changes instead of one per click, which is both the UX JT asked for and
// the fix for the "feels slow" complaint (every prior click was its own
// full page round trip).
export function LibraryFilterBar(props: Props) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELD_KEYS.map(k => [k, props.initial[k] ?? 'all']))
  )
  const [pending, setPending] = useState(false)

  function set(key: string, value: string) {
    setValues(v => ({ ...v, [key]: value }))
  }

  function apply() {
    setPending(true)
    const params = new URLSearchParams()
    for (const key of FIELD_KEYS) {
      const value = values[key]
      if (value && value !== 'all' && !(key === 'sort' && value === 'recommended')) params.set(key, value)
    }
    if (props.search) params.set('search', props.search)
    router.push(`/library?${params.toString()}`)
  }

  return (
    <div style={{
      border: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)',
      borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '3rem',
      background: 'var(--color-paper-darker)',
      display: 'flex', flexDirection: 'column', gap: '0.875rem',
    }}>
      <Row>
        <Select label="Content Type" value={values.type} onChange={v => set('type', v)} options={props.typeOptions} />
        <Select label="Domain" value={values.domain} onChange={v => set('domain', v)} options={props.domainOptions} />
        <Select label="Level" value={values.level} onChange={v => set('level', v)} options={props.levelOptions} />
        <Select label="Intent" value={values.intent} onChange={v => set('intent', v)} options={props.intentOptions} />
        <Select label="Estimated Time" value={values.time} onChange={v => set('time', v)} options={props.timeOptions} />
      </Row>

      <Row>
        <Select label="Topic" value={values.topic} onChange={v => set('topic', v)} options={props.topicOptions} />
        <Select label="Role" value={values.role} onChange={v => set('role', v)} options={props.roleOptions} />
        <Select label="Goal" value={values.goal} onChange={v => set('goal', v)} options={props.goalOptions} />
        <Select label="Series" value={values.series} onChange={v => set('series', v)} options={props.seriesOptions} />
      </Row>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.875rem', paddingTop: '0.375rem', borderTop: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.875rem', flexWrap: 'wrap' }}>
          <Select label="Sort" value={values.sort} onChange={v => set('sort', v)} options={props.sortOptions} />
          <button
            onClick={apply}
            disabled={pending}
            className="btn-primary"
            style={{ height: '2.375rem', opacity: pending ? 0.7 : 1 }}
          >
            {pending ? 'Applying…' : 'Apply →'}
          </button>
        </div>
        <span className="text-label-sm" style={{ color: 'var(--color-text-muted)' }}>
          {props.resultCount} {props.resultCount === 1 ? 'resource' : 'resources'}
        </span>
      </div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>{children}</div>
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Option[] }) {
  return (
    <div style={{ minWidth: '9.5rem', flex: '1 1 9.5rem' }}>
      <label className="text-label-sm" style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '0.5rem 0.625rem', borderRadius: '0.375rem',
          border: '1px solid color-mix(in srgb, var(--color-tertiary) 18%, transparent)',
          background: 'var(--color-paper-base)', color: 'var(--color-ink-deep)', fontSize: '0.8125rem',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
