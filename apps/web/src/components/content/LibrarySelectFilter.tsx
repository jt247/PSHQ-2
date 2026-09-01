'use client'

import { useRouter } from 'next/navigation'

interface Props {
  label: string
  options: string[]
  optionLabels?: Record<string, string>
  active: string
  hrefFor: Record<string, string>
  allLabel: string
}

export function LibrarySelectFilter({ label, options, optionLabels, active, hrefFor, allLabel }: Props) {
  const router = useRouter()

  return (
    <div style={{ minWidth: '10rem' }}>
      <p className="text-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: '0.5rem', opacity: 0.6 }}>{label}</p>
      <select
        defaultValue={active}
        onChange={e => router.push(hrefFor[e.target.value])}
        style={{
          width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.25rem',
          border: '1px solid color-mix(in srgb, var(--color-tertiary) 15%, transparent)',
          background: 'var(--color-paper-darker)', color: 'var(--color-ink-deep)', fontSize: '0.8125rem',
        }}
      >
        {options.map(o => (
          <option key={o} value={o}>{o === 'all' ? allLabel : (optionLabels?.[o] ?? o)}</option>
        ))}
      </select>
    </div>
  )
}
