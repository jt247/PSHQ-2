'use client'

import { useState } from 'react'
import {
  AREAS,
  MAX_AREAS,
  MAX_CUSTOM_AREAS,
  MAX_CUSTOM_AREA_LENGTH,
  parseCustomAreas,
} from '@/app/dashboard/constants'

// One picker shared by onboarding and settings. These were previously two
// separate implementations with two different area lists, which is how users
// ended up holding values that no chip could represent — the counter said
// "7/7 selected" while only 5 chips were lit and every other chip was
// disabled, with no way out. Anything not in AREAS now renders as a
// removable custom tag, so no stored value can ever be invisible again.

interface Props {
  initial: string[]
  /** Rendered into the enclosing form so the server action receives them. */
  name?: string
}

export function AreaPicker({ initial, name = 'areas_of_interest' }: Props) {
  const [selected, setSelected] = useState<string[]>(initial)
  const [draft, setDraft] = useState('')

  const presets = selected.filter(a => AREAS.includes(a))
  const custom = selected.filter(a => !AREAS.includes(a))
  const presetLimitReached = presets.length >= MAX_AREAS
  const customLimitReached = custom.length >= MAX_CUSTOM_AREAS

  function togglePreset(area: string) {
    setSelected(prev =>
      prev.includes(area)
        ? prev.filter(a => a !== area)
        : prev.filter(a => AREAS.includes(a)).length < MAX_AREAS
          ? [...prev, area]
          : prev
    )
  }

  function addCustom() {
    const parsed = parseCustomAreas(draft)
    if (parsed.length === 0) return
    setSelected(prev => {
      const existing = new Set(prev.map(a => a.toLowerCase()))
      const room = MAX_CUSTOM_AREAS - prev.filter(a => !AREAS.includes(a)).length
      const fresh = parsed.filter(p => !existing.has(p.toLowerCase())).slice(0, room)
      return [...prev, ...fresh]
    })
    setDraft('')
  }

  function removeArea(area: string) {
    setSelected(prev => prev.filter(a => a !== area))
  }

  return (
    <div>
      {/* Carries the values into the form action */}
      {selected.map(a => (
        <input key={a} type="hidden" name={name} value={a} />
      ))}

      <div className="tags-grid">
        {AREAS.map(area => {
          const isSelected = selected.includes(area)
          return (
            <button
              key={area}
              type="button"
              onClick={() => togglePreset(area)}
              className={`tag-chip ${isSelected ? 'selected' : ''}`}
              aria-pressed={isSelected}
              disabled={!isSelected && presetLimitReached}
            >
              {area}
            </button>
          )
        })}
      </div>

      <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', margin: '0.625rem 0 0.375rem' }}>
        {presets.length}/{MAX_AREAS} selected
        {presetLimitReached && ' · deselect one to choose another'}
      </p>

      {/* Other — free text, comma separated */}
      <div style={{ marginTop: '0.875rem' }}>
        <label
          htmlFor="custom-area-input"
          className="text-label-sm"
          style={{ display: 'block', color: 'var(--color-ink-deep)', fontWeight: 600, marginBottom: '0.375rem' }}
        >
          Other
        </label>

        {custom.length > 0 && (
          <div className="tags-grid" style={{ marginBottom: '0.5rem' }}>
            {custom.map(area => (
              <button
                key={area}
                type="button"
                onClick={() => removeArea(area)}
                className="tag-chip selected"
                aria-label={`Remove ${area}`}
                title="Remove"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
              >
                {area}
                <span aria-hidden="true" style={{ opacity: 0.7, fontWeight: 700 }}>×</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            id="custom-area-input"
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              // Enter adds the tag instead of submitting the whole form.
              if (e.key === 'Enter') { e.preventDefault(); addCustom() }
            }}
            disabled={customLimitReached}
            maxLength={MAX_CUSTOM_AREA_LENGTH * MAX_CUSTOM_AREAS}
            placeholder="Fintech, Payments, Growth loops"
            style={{
              flex: '1 1 16rem',
              minHeight: '44px',
              padding: '0.5rem 0.75rem',
              border: '1px solid color-mix(in srgb, var(--color-tertiary) 20%, transparent)',
              borderRadius: '0.25rem',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-sans)',
              background: 'var(--color-paper-base)',
              color: 'var(--color-ink-deep)',
            }}
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={customLimitReached || draft.trim() === ''}
            className="tag-chip"
            style={{ minHeight: '44px', padding: '0.5rem 1.25rem', fontWeight: 600 }}
          >
            Add
          </button>
        </div>

        <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', margin: '0.375rem 0 0' }}>
          {customLimitReached
            ? `You've added the maximum of ${MAX_CUSTOM_AREAS}. Remove one to add another.`
            : 'Separate several with commas. These are saved as your own tags.'}
        </p>
      </div>
    </div>
  )
}
