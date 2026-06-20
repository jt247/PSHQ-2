'use client'

import { useState, useTransition } from 'react'

interface StatRow { key: string; value: string }

interface EditionData {
  id?: string
  edition_number?: string
  title?: string
  focus_description?: string | null
  status?: string
  join_method?: string | null
  join_instructions?: string | null
  stats?: Record<string, string | number>
  display_order?: number
}

interface Props {
  edition?: EditionData
  action: (formData: FormData) => Promise<void>
  backHref: string
}

function toStatRows(stats: Record<string, string | number> = {}): StatRow[] {
  const rows = Object.entries(stats).map(([key, value]) => ({ key, value: String(value) }))
  return rows.length > 0 ? rows : [{ key: '', value: '' }]
}

function statsToJson(rows: StatRow[]): string {
  const obj: Record<string, string> = {}
  for (const { key, value } of rows) {
    if (key.trim()) obj[key.trim()] = value.trim()
  }
  return JSON.stringify(obj)
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.625rem', fontSize: '0.875rem',
  border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 600,
  color: '#374151', marginBottom: '0.375rem',
}

export function EditionForm({ edition, action, backHref }: Props) {
  const [isPending, startTransition] = useTransition()
  const [statRows, setStatRows] = useState<StatRow[]>(toStatRows(edition?.stats))

  function addRow() {
    setStatRows(prev => [...prev, { key: '', value: '' }])
  }

  function removeRow(idx: number) {
    setStatRows(prev => prev.filter((_, i) => i !== idx))
  }

  function updateRow(idx: number, field: 'key' | 'value', val: string) {
    setStatRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('stats', statsToJson(statRows))
    startTransition(() => action(formData))
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '640px' }}>
      {/* Edition number + display order */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Edition number *</label>
          <input name="edition_number" required defaultValue={edition?.edition_number ?? ''} placeholder="e.g. 2.0" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Display order</label>
          <input name="display_order" type="number" defaultValue={edition?.display_order ?? 0} style={inputStyle} />
        </div>
      </div>

      {/* Title */}
      <div>
        <label style={labelStyle}>Title *</label>
        <input name="title" required defaultValue={edition?.title ?? ''} placeholder="e.g. Advanced Lovable + Google AI Suite" style={inputStyle} />
      </div>

      {/* Focus description */}
      <div>
        <label style={labelStyle}>Focus description</label>
        <textarea name="focus_description" rows={3} defaultValue={edition?.focus_description ?? ''} placeholder="What this edition covers..." style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* Status + join method */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Status *</label>
          <select name="status" required defaultValue={edition?.status ?? 'coming_soon'} style={inputStyle}>
            <option value="coming_soon">Coming Soon</option>
            <option value="open">Open</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Join method</label>
          <select name="join_method" defaultValue={edition?.join_method ?? ''} style={inputStyle}>
            <option value="">None</option>
            <option value="invitation_email">Invitation (email)</option>
            <option value="open">Open</option>
          </select>
        </div>
      </div>

      {/* Join instructions */}
      <div>
        <label style={labelStyle}>Join instructions</label>
        <textarea name="join_instructions" rows={2} defaultValue={edition?.join_instructions ?? ''} placeholder="e.g. Email hello@productslicehq.com to apply." style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* Stats KV editor */}
      <div>
        <label style={labelStyle}>Edition stats (key–value pairs)</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {statRows.map((row, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                value={row.key}
                onChange={e => updateRow(idx, 'key', e.target.value)}
                placeholder="Label (e.g. Registered)"
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                value={row.value}
                onChange={e => updateRow(idx, 'value', e.target.value)}
                placeholder="Value (e.g. 143)"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="button" onClick={() => removeRow(idx)} style={{
                background: 'none', border: '1px solid #e5e7eb', borderRadius: '0.25rem',
                width: '2rem', height: '2rem', cursor: 'pointer', color: '#9ca3af', fontSize: '1rem', flexShrink: 0,
              }} aria-label="Remove row">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addRow} className="btn-ghost" style={{ fontSize: '0.8125rem', padding: '0.3125rem 0.75rem' }}>
          + Add stat
        </button>
        <input type="hidden" name="stats" value={statsToJson(statRows)} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' }}>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Saving…' : edition?.id ? 'Save changes' : 'Create edition'}
        </button>
        <a href={backHref} className="btn-ghost">Cancel</a>
      </div>
    </form>
  )
}
