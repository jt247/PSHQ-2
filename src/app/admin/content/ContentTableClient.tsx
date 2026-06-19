'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { publishContentAction, unpublishContentAction, archiveContentAction } from './actions'

type ContentStatus = 'draft' | 'published' | 'archived'

interface ContentRow {
  id: string
  title: string
  slug: string
  type: string
  status: ContentStatus
  pricing_type: string
  price_amount: number | null
  currency: string
  view_count: number
  upvote_count: number
  comment_count: number
  tags: string[]
  published_at: string | null
  created_at: string
}

const STATUS_FILTERS: Array<'all' | ContentStatus> = ['all', 'published', 'draft', 'archived']
const TYPE_FILTERS = ['all', 'article', 'ebook', 'template', 'course']

const TYPE_BADGES: Record<string, string> = {
  article:  'badge-blue',
  ebook:    'badge-purple',
  template: 'badge-green',
  course:   'badge-orange',
}

const STATUS_BADGES: Record<string, string> = {
  published: 'badge-green',
  draft:     'badge-gray',
  archived:  'badge-red',
}

function formatNaira(kobo: number | null) {
  if (!kobo) return '—'
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
}

export function ContentTableClient({ content }: { content: ContentRow[] }) {
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all')
  const [typeFilter, setTypeFilter]     = useState('all')
  const [search, setSearch]             = useState('')
  const [isPending, startTransition]    = useTransition()

  const filtered = content.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (typeFilter !== 'all' && c.type !== typeFilter) return false
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function act(fn: () => Promise<void>) {
    startTransition(fn)
  }

  return (
    <div className="content-table-wrap">
      {/* Filters */}
      <div className="table-filters">
        <input
          type="search" placeholder="Search titles…" value={search}
          onChange={e => setSearch(e.target.value)} className="filter-search"
        />
        <div className="filter-group">
          {STATUS_FILTERS.map(s => (
            <button
              key={s} onClick={() => setStatusFilter(s)}
              className={`filter-btn ${statusFilter === s ? 'active' : ''}`}
            >
              {s === 'all' ? 'All status' : s}
            </button>
          ))}
        </div>
        <div className="filter-group">
          {TYPE_FILTERS.map(t => (
            <button
              key={t} onClick={() => setTypeFilter(t)}
              className={`filter-btn ${typeFilter === t ? 'active' : ''}`}
            >
              {t === 'all' ? 'All types' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Pricing</th>
              <th title="Views">Views</th>
              <th title="Upvotes">↑</th>
              <th title="Comments">💬</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="table-empty">No content matches your filters.</td>
              </tr>
            )}
            {filtered.map(row => (
              <tr key={row.id} className={row.status === 'archived' ? 'row-archived' : ''}>
                <td className="td-title">
                  <Link href={`/admin/content/${row.id}/edit`} className="table-title-link">
                    {row.title}
                  </Link>
                  <span className="table-slug">/{row.slug}</span>
                </td>
                <td><span className={`badge ${TYPE_BADGES[row.type] ?? 'badge-gray'}`}>{row.type}</span></td>
                <td><span className={`badge ${STATUS_BADGES[row.status] ?? 'badge-gray'}`}>{row.status}</span></td>
                <td>
                  {row.pricing_type === 'paid'
                    ? <span className="badge badge-yellow">{formatNaira(row.price_amount)}</span>
                    : <span className="badge badge-gray">Free</span>
                  }
                </td>
                <td className="td-num">{row.view_count.toLocaleString()}</td>
                <td className="td-num">{row.upvote_count}</td>
                <td className="td-num">{row.comment_count}</td>
                <td className="td-actions">
                  <Link href={`/admin/content/${row.id}/edit`} className="action-btn">Edit</Link>
                  {row.status === 'draft' && (
                    <button
                      disabled={isPending}
                      onClick={() => act(() => publishContentAction(row.id))}
                      className="action-btn action-publish"
                    >
                      Publish
                    </button>
                  )}
                  {row.status === 'published' && (
                    <button
                      disabled={isPending}
                      onClick={() => act(() => unpublishContentAction(row.id))}
                      className="action-btn"
                    >
                      Unpublish
                    </button>
                  )}
                  {row.status !== 'archived' && (
                    <button
                      disabled={isPending}
                      onClick={() => {
                        if (confirm(`Archive "${row.title}"? It won't be deleted.`)) {
                          act(() => archiveContentAction(row.id))
                        }
                      }}
                      className="action-btn action-danger"
                    >
                      Archive
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="table-count">Showing {filtered.length} of {content.length} items</p>
    </div>
  )
}
