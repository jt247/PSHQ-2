'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  contentId: string
  isLoggedIn: boolean
  cachedSummary?: {
    summary: string
    bullets: string[]
    concepts: string[]
  } | null
}

interface SummaryData {
  summary: string
  bullets: string[]
  concepts: string[]
}

// Shared with ListenButton's block styling so the two sit as equal-weight
// blocks in the row above the article body, instead of one stretching to
// fill the space next to a tiny pill.
export const summaryBlockStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
  width: '100%',
  padding: '0.75rem 1rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.625rem',
  background: '#fff',
  color: '#374151',
  fontSize: '0.875rem', fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 150ms',
}

export function AiSummaryPanel({ contentId, isLoggedIn, cachedSummary }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SummaryData | null>(cachedSummary ?? null)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!isLoggedIn) {
    return (
      <div style={{ ...summaryBlockStyle, cursor: 'default', color: '#6b7280' }}>
        <span>✨</span>
        <a href="/sign-in" style={{ color: '#6366f1', fontWeight: 600 }}>Sign in for AI Summary</a>
      </div>
    )
  }

  async function generate() {
    setOpen(true)
    if (data) return
    setLoading(true)
    setError(null)

    try {
      const cacheRes = await fetch(`/api/ai-summary/${contentId}`)
      const cacheJson = await cacheRes.json()

      if (cacheJson.cached) {
        setData({ summary: cacheJson.summary, bullets: cacheJson.bullets ?? [], concepts: cacheJson.concepts ?? [] })
        setLoading(false)
        return
      }

      const res = await fetch(`/api/ai-summary/${contentId}`, { method: 'POST' })
      const json = await res.json()

      if (res.status === 429) {
        setError(json.error ?? 'AI quota reached. Try again in a minute.')
      } else if (!res.ok) {
        setError(json.error ?? 'Failed to generate summary. Try again.')
      } else {
        setData({ summary: json.summary, bullets: json.bullets ?? [], concepts: json.concepts ?? [] })
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={generate} style={summaryBlockStyle}>
        <span>✨</span>
        <span>AI Summary</span>
      </button>

      {open && mounted && createPortal(
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: 0,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              width: '100%', maxWidth: '640px',
              maxHeight: '85vh', overflowY: 'auto',
              borderRadius: '1rem 1rem 0 0',
              padding: '1.5rem',
              boxShadow: '0 -8px 30px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>✨</span>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>AI Summary</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  border: 'none', background: '#f3f4f6', borderRadius: '9999px',
                  width: '2rem', height: '2rem', fontSize: '1rem', cursor: 'pointer', color: '#374151',
                }}
              >
                ×
              </button>
            </div>

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                Generating summary…
              </div>
            )}

            {error && (
              <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: 0 }}>{error}</p>
            )}

            {data && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ margin: 0, lineHeight: 1.6, fontSize: '0.9375rem', color: '#374151' }}>
                  {data.summary}
                </p>

                {data.bullets.length > 0 && (
                  <div>
                    <p style={{ margin: '0 0 0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Key Points
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {data.bullets.map((b, i) => (
                        <li key={i} style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.5 }}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.concepts.length > 0 && (
                  <div>
                    <p style={{ margin: '0 0 0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Key Concepts
                    </p>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {data.concepts.map((c, i) => (
                        <span key={i} style={{
                          background: '#eef2ff', color: '#4f46e5',
                          fontSize: '0.75rem', fontWeight: 500, padding: '0.125rem 0.5rem', borderRadius: '9999px',
                        }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
