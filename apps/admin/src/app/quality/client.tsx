'use client'

import { useState, useTransition } from 'react'
import { toggleReviewVisibilityAction } from './actions'

interface Row {
  id: string; score: number; review_text: string | null; is_hidden: boolean; created_at: string;
  content: { id: string; title: string; slug: string; type: string } | null;
  user: { full_name: string | null; email: string } | null
}

const STARS = ['★', '★★', '★★★', '★★★★', '★★★★★']

export function QualityRow({ row }: { row: Row }) {
  const [hidden, setHidden] = useState(row.is_hidden)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next = !hidden
    setHidden(next)
    startTransition(() => toggleReviewVisibilityAction(row.id, next))
  }

  return (
    <tr style={{ opacity: hidden ? 0.5 : 1 }}>
      <td>
        <div style={{ fontWeight: 500, fontSize: '0.875rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.content?.title ?? '—'}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{row.content?.type ?? ''}</div>
      </td>
      <td>
        <div style={{ fontSize: '0.875rem' }}>{row.user?.full_name ?? '—'}</div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{row.user?.email ?? '—'}</div>
      </td>
      <td>
        <span style={{ color: '#f59e0b', fontSize: '0.875rem' }}>{STARS[(row.score ?? 1) - 1]}</span>
        <span style={{ color: '#9ca3af', fontSize: '0.75rem', marginLeft: '0.25rem' }}>{row.score}/5</span>
      </td>
      <td style={{ maxWidth: '220px' }}>
        {row.review_text ? (
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#374151', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {row.review_text}
          </p>
        ) : (
          <span style={{ color: '#d1d5db', fontSize: '0.8125rem' }}>No review text</span>
        )}
      </td>
      <td>
        <span style={{ ...badge, background: hidden ? '#fef3c7' : '#dcfce7', color: hidden ? '#b45309' : '#15803d' }}>
          {hidden ? 'hidden' : 'visible'}
        </span>
      </td>
      <td>
        <button onClick={toggle} disabled={isPending} style={btn}>
          {isPending ? '…' : hidden ? 'Show' : 'Hide'}
        </button>
      </td>
    </tr>
  )
}

const badge: React.CSSProperties = { display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }
const btn: React.CSSProperties = { padding: '0.25rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', fontSize: '0.8125rem', cursor: 'pointer', color: '#374151' }
