'use client'

import { useState, useTransition } from 'react'
import { toggleCommentHiddenAction, approveCommentContributionAction } from './actions'

interface Row {
  id: string; body: string; is_hidden: boolean; is_flagged: boolean; is_approved: boolean;
  created_at: string; user_id: string; user: { full_name: string | null; email: string } | null;
  content: { title: string; slug: string } | null
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function CommentRow({ row }: { row: Row }) {
  const [isPending, startTransition] = useTransition()
  const [hidden, setHidden] = useState(row.is_hidden)
  const [approved, setApproved] = useState(row.is_approved)

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: hidden ? 0.6 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ fontSize: '0.875rem' }}>{row.user?.full_name ?? row.user?.email ?? 'Unknown'}</strong>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '0.5rem' }}>on “{row.content?.title ?? 'Unknown content'}” · {timeAgo(row.created_at)}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {row.is_flagged && <span className="badge badge-orange">Flagged</span>}
          {hidden && <span className="badge badge-red">Hidden</span>}
          {approved && <span className="badge badge-green">Approved</span>}
        </div>
      </div>
      <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>{row.body}</p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          disabled={isPending}
          onClick={() => { const next = !hidden; setHidden(next); startTransition(() => toggleCommentHiddenAction(row.id, next)) }}
          className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
        >
          {hidden ? 'Unhide' : 'Hide'}
        </button>
        {!approved && (
          <button
            disabled={isPending}
            onClick={() => { setApproved(true); startTransition(() => approveCommentContributionAction(row.id, row.user_id)) }}
            className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', color: '#15803d', borderColor: '#86efac' }}
          >
            Approve as contribution
          </button>
        )}
      </div>
    </div>
  )
}

export function ModerationClient({ rows, currentView }: { rows: Row[]; currentView: string }) {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Comment Moderation</h1>
          <p className="admin-page-subtitle">Hide comments, review the flagged queue, and approve helpful contributions.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem' }}>
        {['flagged', 'hidden', 'all'].map(v => (
          <a key={v} href={`?view=${v}`} className="filter-btn" style={{ fontWeight: currentView === v ? 700 : 400 }}>
            {v === 'flagged' ? 'Flagged queue' : v === 'hidden' ? 'Hidden' : 'All comments'}
          </a>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {rows.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: '3rem' }}>Nothing here.</p>
        ) : rows.map(r => <CommentRow key={r.id} row={r} />)}
      </div>
    </div>
  )
}
