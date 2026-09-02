'use client'

import { useState, useTransition } from 'react'

interface PathData {
  id?: string
  title?: string
  slug?: string
  description?: string | null
  target_audience?: string | null
  level?: string | null
  estimated_time_minutes?: number | null
  outcomes?: string[]
  prerequisites?: string[]
}

interface Props {
  path?: PathData
  action: (formData: FormData) => Promise<void>
}

const LEVELS = ['exploring', 'beginner', 'intermediate', 'senior', 'leader']

export function LearningPathForm({ path, action }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try { await action(fd) } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="content-form">
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="title">Title *</label>
          <input id="title" name="title" required defaultValue={path?.title ?? ''} />
        </div>
        <div className="form-field">
          <label htmlFor="slug">Slug</label>
          <input id="slug" name="slug" defaultValue={path?.slug ?? ''} placeholder="auto from title if blank" />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} defaultValue={path?.description ?? ''} />
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="target_audience">Target audience</label>
          <input id="target_audience" name="target_audience" defaultValue={path?.target_audience ?? ''} />
        </div>
        <div className="form-field">
          <label htmlFor="level">Level</label>
          <select id="level" name="level" defaultValue={path?.level ?? ''}>
            <option value="">—</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="estimated_time_minutes">Estimated time (min)</label>
          <input id="estimated_time_minutes" name="estimated_time_minutes" type="number" min="0" defaultValue={path?.estimated_time_minutes ?? ''} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="outcomes">Outcomes <span style={{ fontWeight: 400, color: '#9ca3af' }}>(one per line)</span></label>
          <textarea id="outcomes" name="outcomes" rows={4} defaultValue={(path?.outcomes ?? []).join('\n')} />
        </div>
        <div className="form-field">
          <label htmlFor="prerequisites">Prerequisites <span style={{ fontWeight: 400, color: '#9ca3af' }}>(one per line)</span></label>
          <textarea id="prerequisites" name="prerequisites" rows={4} defaultValue={(path?.prerequisites ?? []).join('\n')} />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? 'Saving…' : path?.id ? 'Save changes' : 'Create path'}
        </button>
      </div>
    </form>
  )
}
