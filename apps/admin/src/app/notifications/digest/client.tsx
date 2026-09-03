'use client'

import { useState, useTransition } from 'react'
import { createDigestDraftAction, approveDigestAction, sendDigestAction, refreshDigestReturnStatsAction, updateDigestDraftAction } from './actions'

interface DigestIssueRow {
  id: string; week_of: string; status: string; subject: string
  insight_content_id: string | null; resource_content_id: string | null; build_note_content_id: string | null
  community_highlight_note: string | null; thing_to_try: string | null; sent_at: string | null
}
interface ContentTitle { id: string; title: string; slug: string }
interface RecipientCounts { delivered: number; opened: number; clicked: number; unsubscribed: number; returned: number }

function nextMonday(): string {
  const d = new Date()
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7))
  return d.toISOString().slice(0, 10)
}

export function DigestClient({ issues, contentTitles, topics, recipientCounts }: {
  issues: DigestIssueRow[]; contentTitles: Record<string, ContentTitle>; topics: Array<{ id: string; name: string }>; recipientCounts: Record<string, RecipientCounts>
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [weekOf, setWeekOf] = useState(nextMonday())
  const [topicId, setTopicId] = useState('')

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      const res = await createDigestDraftAction(weekOf, topicId || null)
      if (res.error) setError(res.error)
    })
  }

  return (
    <div className="admin-main-inner" style={{ maxWidth: '840px' }}>
      <h1 style={{ margin: '0 0 0.375rem', fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-ink-deep)' }}>
        ProductSlice Weekly
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', margin: '0 0 2rem' }}>
        Assembled from real, published content only. Every issue holds as a draft until you approve and send it — nothing sends automatically.
      </p>

      {error && <div style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', padding: '0.875rem 1rem', marginBottom: '1.25rem', color: '#b91c1c', fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>Week of</label>
          <input type="date" value={weekOf} onChange={e => setWeekOf(e.target.value)} style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>Topic (optional segment)</label>
          <select value={topicId} onChange={e => setTopicId(e.target.value)} style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}>
            <option value="">Everyone</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <button onClick={handleCreate} disabled={pending} style={{ padding: '0.625rem 1.25rem', background: 'var(--color-ink-deep)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: pending ? 'not-allowed' : 'pointer' }}>
          {pending ? 'Assembling…' : 'Assemble draft from real content'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {issues.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No digest issues yet.</p>
        ) : issues.map(issue => (
          <DigestCard key={issue.id} issue={issue} contentTitles={contentTitles} counts={recipientCounts[issue.id]} />
        ))}
      </div>
    </div>
  )
}

function DigestCard({ issue, contentTitles, counts }: { issue: DigestIssueRow; contentTitles: Record<string, ContentTitle>; counts?: RecipientCounts }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [thingToTry, setThingToTry] = useState(issue.thing_to_try ?? '')
  const [highlightNote, setHighlightNote] = useState(issue.community_highlight_note ?? '')

  const slots: Array<[string, string | null]> = [
    ['One new insight', issue.insight_content_id],
    ['One practical resource', issue.resource_content_id],
    ['One JT Build Note', issue.build_note_content_id],
  ]

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.error) setError(res.error)
    })
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: 700 }}>Week of {issue.week_of}</span>
        <StatusBadge status={issue.status} />
      </div>

      {slots.map(([label, contentId]) => (
        <div key={label} style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          <strong>{label}: </strong>
          {contentId && contentTitles[contentId] ? contentTitles[contentId].title : <em style={{ color: '#9ca3af' }}>No unused real content available for this slot</em>}
        </div>
      ))}

      <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
        <strong>Community highlight: </strong>
        {issue.status === 'draft' ? (
          <input value={highlightNote} onChange={e => setHighlightNote(e.target.value)} style={{ width: '100%', padding: '0.375rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '0.25rem' }} />
        ) : (highlightNote || <em style={{ color: '#9ca3af' }}>None available this week</em>)}
      </div>

      <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>
        <strong>One thing to try: </strong>
        {issue.status === 'draft' ? (
          <input value={thingToTry} onChange={e => setThingToTry(e.target.value)} style={{ width: '100%', padding: '0.375rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '0.25rem' }} />
        ) : (thingToTry || <em style={{ color: '#9ca3af' }}>None</em>)}
      </div>

      {error && <p style={{ color: '#b91c1c', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>{error}</p>}

      {issue.status === 'draft' && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => run(() => updateDigestDraftAction(issue.id, { thing_to_try: thingToTry, community_highlight_note: highlightNote }))}
            disabled={pending}
            style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '0.8125rem' }}
          >
            Save edits
          </button>
          <button
            onClick={() => run(() => approveDigestAction(issue.id))}
            disabled={pending}
            style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', background: '#111827', color: '#fff', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
          >
            Approve
          </button>
        </div>
      )}

      {issue.status === 'approved' && (
        <button
          onClick={() => run(() => sendDigestAction(issue.id))}
          disabled={pending}
          style={{ padding: '0.5rem 1.25rem', border: 'none', borderRadius: '6px', background: '#15803d', color: '#fff', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
        >
          {pending ? 'Sending…' : 'Send now'}
        </button>
      )}

      {issue.status === 'sent' && counts && (
        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8125rem', color: '#374151', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <span>Delivered: <strong>{counts.delivered}</strong></span>
          <span>Opened: <strong>{counts.opened}</strong></span>
          <span>Clicked: <strong>{counts.clicked}</strong></span>
          <span>Unsubscribed: <strong>{counts.unsubscribed}</strong></span>
          <span>Returned: <strong>{counts.returned}</strong></span>
          <button onClick={() => run(() => refreshDigestReturnStatsAction(issue.id))} disabled={pending} style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.8125rem', padding: 0 }}>
            Refresh return stats
          </button>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    draft: { bg: '#f3f4f6', text: '#374151' },
    approved: { bg: '#fef3c7', text: '#92400e' },
    sent: { bg: '#dcfce7', text: '#15803d' },
  }
  const s = map[status] ?? map.draft
  return <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: s.bg, color: s.text, padding: '0.15rem 0.5rem', borderRadius: '0.2rem' }}>{status}</span>
}
