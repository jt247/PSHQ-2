'use client'

import { useState, useTransition } from 'react'
import { addModuleAction, deleteModuleAction, toggleModuleRequiredAction, reorderModulesAction } from '@/app/learning-paths/actions'

interface Module {
  id: string
  title: string
  description: string | null
  is_required: boolean
  sequence: number
  content_id: string | null
}

interface ContentOption { id: string; title: string }

export function LearningPathModules({ pathId, modules, contentOptions }: { pathId: string; modules: Module[]; contentOptions: ContentOption[] }) {
  const [isPending, startTransition] = useTransition()
  const [order, setOrder] = useState(modules.map(m => m.id))
  const [showAdd, setShowAdd] = useState(false)

  const byId = new Map(modules.map(m => [m.id, m]))

  function move(idx: number, dir: -1 | 1) {
    const next = [...order]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setOrder(next)
    startTransition(() => reorderModulesAction(pathId, next))
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await addModuleAction(pathId, fd)
      setShowAdd(false)
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {order.map((id, i) => {
          const m = byId.get(id)
          if (!m) return null
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.625rem 0.875rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <button type="button" disabled={isPending || i === 0} onClick={() => move(i, -1)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>▲</button>
                <button type="button" disabled={isPending || i === order.length - 1} onClick={() => move(i, 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>▼</button>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{m.title}</p>
                {m.description && <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: '#6b7280' }}>{m.description}</p>}
              </div>
              <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input
                  type="checkbox" defaultChecked={m.is_required}
                  onChange={e => startTransition(() => toggleModuleRequiredAction(pathId, id, e.target.checked))}
                />
                Required
              </label>
              <button
                type="button"
                onClick={() => startTransition(() => deleteModuleAction(pathId, id))}
                style={{ border: '1px solid #fca5a5', color: '#dc2626', background: 'none', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Remove
              </button>
            </div>
          )
        })}
        {order.length === 0 && <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>No modules yet.</p>}
      </div>

      {showAdd ? (
        <form onSubmit={handleAdd} style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <input name="title" required placeholder="Module title *" style={{ padding: '0.375rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }} />
          <textarea name="description" rows={2} placeholder="Description (optional)" style={{ padding: '0.375rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }} />
          <select name="content_id" style={{ padding: '0.375rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}>
            <option value="">— Standalone module (no linked content) —</option>
            {contentOptions.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <label style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <input type="checkbox" name="is_required" defaultChecked /> Required
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={isPending} className="btn-primary">{isPending ? 'Adding…' : 'Add module'}</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setShowAdd(true)} className="btn-ghost">+ Add module</button>
      )}
    </div>
  )
}
