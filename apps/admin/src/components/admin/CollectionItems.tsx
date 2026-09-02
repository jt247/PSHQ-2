'use client'

import { useState, useTransition } from 'react'
import { addCollectionItemAction, removeCollectionItemAction, reorderCollectionItemsAction } from '@/app/collections/actions'

interface Item { id: string; content_id: string; title: string; type: string }
interface ContentOption { id: string; title: string }

export function CollectionItems({ collectionId, items, contentOptions }: { collectionId: string; items: Item[]; contentOptions: ContentOption[] }) {
  const [isPending, startTransition] = useTransition()
  const [order, setOrder] = useState(items.map(i => i.id))
  const [addingId, setAddingId] = useState('')
  const byId = new Map(items.map(i => [i.id, i]))

  function move(idx: number, dir: -1 | 1) {
    const next = [...order]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setOrder(next)
    startTransition(() => reorderCollectionItemsAction(collectionId, next))
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {order.map((id, i) => {
          const item = byId.get(id)
          if (!item) return null
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.625rem 0.875rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <button type="button" disabled={isPending || i === 0} onClick={() => move(i, -1)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>▲</button>
                <button type="button" disabled={isPending || i === order.length - 1} onClick={() => move(i, 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>▼</button>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{item.title}</p>
                <span style={{ fontSize: '0.6875rem', color: '#9ca3af', textTransform: 'uppercase' }}>{item.type}</span>
              </div>
              <button
                type="button"
                onClick={() => startTransition(() => removeCollectionItemAction(collectionId, id))}
                style={{ border: '1px solid #fca5a5', color: '#dc2626', background: 'none', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Remove
              </button>
            </div>
          )
        })}
        {order.length === 0 && <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>No items yet.</p>}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <select value={addingId} onChange={e => setAddingId(e.target.value)} style={{ flex: 1, padding: '0.375rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}>
          <option value="">Select content to add…</option>
          {contentOptions.filter(c => !items.some(i => i.content_id === c.id)).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <button
          type="button" disabled={!addingId || isPending} className="btn-primary"
          onClick={() => { const id = addingId; setAddingId(''); startTransition(() => addCollectionItemAction(collectionId, id)) }}
        >
          Add
        </button>
      </div>
    </div>
  )
}
