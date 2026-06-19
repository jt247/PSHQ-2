'use client'

import { useState } from 'react'

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

export function AiSummaryPanel({ contentId, isLoggedIn, cachedSummary }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SummaryData | null>(cachedSummary ?? null)
  const [error, setError] = useState<string | null>(null)

  if (!isLoggedIn) {
    return (
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>✨</span>
          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>AI Summary</span>
        </div>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>
          <a href="/sign-in" style={{ color: '#6366f1' }}>Sign in</a> to use AI Summary.
        </p>
      </div>
    )
  }

  async function generate() {
    setOpen(true)
    if (data) return
    setLoading(true)
    setError(null)

    try {
      // Check cache first
      const cacheRes = await fetch(`/api/ai-summary/${contentId}`)
      const cacheJson = await cacheRes.json()

      if (cacheJson.cached) {
        setData({ summary: cacheJson.summary, bullets: cacheJson.bullets ?? [], concepts: cacheJson.concepts ?? [] })
        setLoading(false)
        return
      }

      // Generate
      const res = await fetch(`/api/ai-summary/${contentId}`, { method: 'POST' })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Failed to generate summary.')
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
    <div style={panelStyle}>
      <button
        onClick={generate}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, width: '100%', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '1rem' }}>✨</span>
        <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#111827' }}>AI Summary</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6366f1' }}>
          {open ? '▲ Close' : '▼ Generate'}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: '0.875rem' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
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
      )}
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  background: '#fafafa',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '1rem 1.125rem',
  marginBottom: '1.5rem',
}
