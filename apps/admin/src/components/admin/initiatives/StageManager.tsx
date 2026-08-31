'use client'

import { useState, useTransition } from 'react'

interface Stage {
  id: string
  title: string
  description: string | null
  stage_order: number
  duration_weeks: number | null
}

interface Props {
  pathwayId: string
  stages: Stage[]
  createAction: (pathwayId: string, formData: FormData) => Promise<void>
  updateAction: (stageId: string, formData: FormData) => Promise<void>
  deleteAction: (stageId: string) => Promise<void>
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.625rem', fontSize: '0.875rem',
  border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem',
}

function StageForm({
  stage,
  onSave,
  onCancel,
  isPending,
}: {
  stage?: Stage
  onSave: (fd: FormData) => void
  onCancel: () => void
  isPending: boolean
}) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave(fd)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Title *</label>
          <input name="title" required defaultValue={stage?.title ?? ''} placeholder="Stage title" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Order</label>
          <input name="stage_order" type="number" defaultValue={stage?.stage_order ?? 0} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Weeks</label>
          <input name="duration_weeks" type="number" defaultValue={stage?.duration_weeks ?? ''} placeholder="—" style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea name="description" rows={2} defaultValue={stage?.description ?? ''} placeholder="What happens in this stage…" style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="btn-primary" disabled={isPending} style={{ fontSize: '0.8125rem', padding: '0.375rem 0.875rem' }}>
          {isPending ? 'Saving…' : stage ? 'Update stage' : 'Add stage'}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel} style={{ fontSize: '0.8125rem', padding: '0.375rem 0.875rem' }}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export function StageManager({ pathwayId, stages: initialStages, createAction, updateAction, deleteAction }: Props) {
  const [stages, setStages] = useState<Stage[]>(initialStages)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleCreate(fd: FormData) {
    startTransition(async () => {
      await createAction(pathwayId, fd)
      setShowNew(false)
    })
  }

  function handleUpdate(stageId: string, fd: FormData) {
    startTransition(async () => {
      await updateAction(stageId, fd)
      setEditingId(null)
    })
  }

  function handleDelete(stageId: string) {
    if (!confirm('Delete this stage?')) return
    startTransition(async () => {
      await deleteAction(stageId)
      setStages(prev => prev.filter(s => s.id !== stageId))
    })
  }

  const sorted = [...stages].sort((a, b) => a.stage_order - b.stage_order)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {sorted.length === 0 && !showNew && (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem', background: '#f9fafb', borderRadius: '0.375rem' }}>
          No stages yet. Add the first one below.
        </div>
      )}

      {sorted.map(stage => (
        <div key={stage.id}>
          {editingId === stage.id ? (
            <StageForm
              stage={stage}
              onSave={fd => handleUpdate(stage.id, fd)}
              onCancel={() => setEditingId(null)}
              isPending={isPending}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.875rem 1rem', background: '#fff', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#d1d5db', marginTop: '0.125rem', minWidth: '1.5rem' }}>
                {String(stage.stage_order).padStart(2, '0')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{stage.title}</div>
                {stage.description && <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>{stage.description}</div>}
                {stage.duration_weeks && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>{stage.duration_weeks}w</div>}
              </div>
              <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setEditingId(stage.id)}
                  style={{ padding: '0.25rem 0.625rem', fontSize: '0.8125rem' }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => handleDelete(stage.id)}
                  style={{ padding: '0.25rem 0.625rem', fontSize: '0.8125rem', color: '#ef4444' }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showNew ? (
        <StageForm
          onSave={handleCreate}
          onCancel={() => setShowNew(false)}
          isPending={isPending}
        />
      ) : (
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setShowNew(true)}
          style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem', alignSelf: 'flex-start' }}
        >
          + Add stage
        </button>
      )}
    </div>
  )
}
