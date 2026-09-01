'use client'

import { useState, useTransition } from 'react'
import { saveExerciseResponseAction, deleteExerciseResponseAction } from '@/app/(public)/content/[slug]/actions'

interface Props {
  exerciseId: string
  prompt: string
  initialResponse: string | null
  isLoggedIn: boolean
}

export function ExerciseWidget({ exerciseId, prompt, initialResponse, isLoggedIn }: Props) {
  const [value, setValue] = useState(initialResponse ?? '')
  const [saved, setSaved] = useState(!!initialResponse)
  const [editing, setEditing] = useState(!initialResponse)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await saveExerciseResponseAction(exerciseId, value)
      if (result.error) { setError(result.error); return }
      setSaved(true)
      setEditing(false)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteExerciseResponseAction(exerciseId)
      setValue('')
      setSaved(false)
      setEditing(true)
    })
  }

  if (!isLoggedIn) {
    return (
      <div style={{ padding: '1.25rem', background: 'var(--color-paper-darker)', borderRadius: '0.5rem' }}>
        <p className="text-body-md" style={{ fontWeight: 600, color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>{prompt}</p>
        <a href="/sign-in" className="text-body-sm" style={{ color: 'var(--color-ink-deep)' }}>Sign in to save your response →</a>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.25rem', background: 'var(--color-paper-darker)', borderRadius: '0.5rem' }}>
      <p className="text-body-md" style={{ fontWeight: 600, color: 'var(--color-ink-deep)', marginBottom: '0.75rem' }}>{prompt}</p>

      {editing ? (
        <>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Write your response — only you can see this."
            rows={4}
            style={{
              width: '100%', padding: '0.75rem', borderRadius: '0.375rem',
              border: '1px solid color-mix(in srgb, var(--color-tertiary) 20%, transparent)',
              fontFamily: 'inherit', fontSize: '0.9375rem', resize: 'vertical', marginBottom: '0.75rem',
            }}
          />
          {error && <p className="text-body-sm" style={{ color: '#dc2626', marginBottom: '0.5rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleSave} disabled={isPending} className="btn-primary">{isPending ? 'Saving…' : 'Save Response'}</button>
            {saved && <button onClick={() => setEditing(false)} className="btn-secondary" type="button">Cancel</button>}
          </div>
        </>
      ) : (
        <>
          <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap', marginBottom: '0.75rem' }}>{value}</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setEditing(true)} className="btn-secondary" type="button">Edit</button>
            <button onClick={handleDelete} disabled={isPending} className="btn-secondary" type="button">Delete</button>
          </div>
        </>
      )}
    </div>
  )
}
