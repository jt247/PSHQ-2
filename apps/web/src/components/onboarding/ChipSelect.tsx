'use client'

import { useState } from 'react'

interface SingleProps {
  name: string
  options: readonly string[]
  initial?: string | null
  labels?: Record<string, string>
}

// Single-select — renders a hidden input carrying the selected value so it
// posts with the surrounding <form> the same way a native radio group would.
export function ChipSingleSelect({ name, options, initial, labels }: SingleProps) {
  const [selected, setSelected] = useState<string | null>(initial ?? null)

  return (
    <div>
      <input type="hidden" name={name} value={selected ?? ''} />
      <div className="tags-grid">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => setSelected(opt)}
            className={`tag-chip ${selected === opt ? 'selected' : ''}`}
            aria-pressed={selected === opt}
          >
            {labels?.[opt] ?? opt}
          </button>
        ))}
      </div>
    </div>
  )
}

interface MultiProps {
  name: string
  options: readonly string[]
  initial?: string[]
  max?: number
  exclude?: string | null
}

// Multi-select over a fixed option list — no free-text "Other" entry, since
// Epic A's Goals/Topics/secondary-role lists are all closed sets, unlike
// the older AreaPicker this deliberately doesn't reuse.
export function ChipMultiSelect({ name, options, initial = [], max, exclude }: MultiProps) {
  const [selected, setSelected] = useState<string[]>(initial)
  const visible = options.filter(o => o !== exclude)
  const limitReached = max != null && selected.length >= max

  function toggle(opt: string) {
    setSelected(prev =>
      prev.includes(opt)
        ? prev.filter(o => o !== opt)
        : (limitReached ? prev : [...prev, opt])
    )
  }

  return (
    <div>
      {selected.map(v => <input key={v} type="hidden" name={name} value={v} />)}
      <div className="tags-grid">
        {visible.map(opt => {
          const isSelected = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`tag-chip ${isSelected ? 'selected' : ''}`}
              aria-pressed={isSelected}
              disabled={!isSelected && limitReached}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {max != null && (
        <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', margin: '0.625rem 0 0' }}>
          {selected.length}/{max} selected
        </p>
      )}
    </div>
  )
}
