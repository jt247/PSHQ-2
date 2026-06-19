'use client'

import { useState, useTransition } from 'react'
import type { RequestStatus } from '@/types/database'
import { updateRequestStatusAction } from './actions'

const STATUS_COLORS: Record<string, string> = {
  open: '#1d4ed8', in_review: '#c2410c', planned: '#7c3aed', completed: '#15803d', declined: '#6b7280',
}

interface Row {
  id: string; title: string; description: string | null; status: string;
  content_type_requested: string | null; created_at: string;
  user: { full_name: string | null; email: string } | null
}

const STATUSES: RequestStatus[] = ['open', 'in_review', 'planned', 'completed', 'declined']

export function AdminRequestRow({ row }: { row: Row }) {
  const [status, setStatus] = useState(row.status)
  const [isPending, startTransition] = useTransition()
  const color = STATUS_COLORS[status] ?? '#374151'

  function handleChange(newStatus: string) {
    setStatus(newStatus)
    startTransition(() => updateRequestStatusAction(row.id, newStatus as RequestStatus))
  }

  return (
    <tr style={{ opacity: isPending ? 0.6 : 1 }}>
      <td>
        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{row.user?.full_name ?? '—'}</div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{row.user?.email ?? '—'}</div>
      </td>
      <td>
        <div style={{ fontWeight: 500 }}>{row.title}</div>
        {row.description && (
          <div style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.125rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.description}
          </div>
        )}
      </td>
      <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{row.content_type_requested ?? '—'}</td>
      <td><span style={{ ...badge, background: `${color}18`, color }}>{status.replace('_', ' ')}</span></td>
      <td style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
        {new Date(row.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
      </td>
      <td>
        <select value={status} onChange={e => handleChange(e.target.value)} style={selectStyle}>
          {STATUSES.map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </td>
    </tr>
  )
}

const badge: React.CSSProperties = { display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }
const selectStyle: React.CSSProperties = { padding: '0.25rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8125rem', outline: 'none', background: '#fff' }
