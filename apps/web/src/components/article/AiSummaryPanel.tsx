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

type AssistanceAction = 'key_takeaways' | 'action_checklist' | 'reflection_questions'
type TabKey = 'summary' | AssistanceAction

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'summary', label: 'Summary' },
  { key: 'key_takeaways', label: 'Key Takeaways' },
  { key: 'action_checklist', label: 'Action Checklist' },
  { key: 'reflection_questions', label: 'Reflect' },
]

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

// Epic E §E.9-E.13 — one unified AI panel, not four scattered buttons
// (JT decision, 2026-09-01). Summary keeps its exact pre-existing
// behavior and format (untouched per JT's preference for the current
// 2-3 sentence + bullets + concepts shape over the build prompt's longer
// paragraph spec). Key Takeaways / Action Checklist / Questions to
// Reflect are new tabs inside the SAME sheet, each lazily fetched from
// /api/ai/content-assistance/[contentId] on first open. Explain Simply
// (E.11) is deliberately not a tab — JT's direct call, summaries already
// cover that job.
export function AiSummaryPanel({ contentId, isLoggedIn, cachedSummary }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<TabKey>('summary')
  const [mounted, setMounted] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryData, setSummaryData] = useState<SummaryData | null>(cachedSummary ?? null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [assistance, setAssistance] = useState<Partial<Record<AssistanceAction, string[]>>>({})
  const [assistanceLoading, setAssistanceLoading] = useState<AssistanceAction | null>(null)
  const [assistanceError, setAssistanceError] = useState<Partial<Record<AssistanceAction, string>>>({})

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
        <a href="/sign-in" style={{ color: '#6366f1', fontWeight: 600 }}>Sign in for AI Assistant</a>
      </div>
    )
  }

  async function generateSummary() {
    if (summaryData) return
    setSummaryLoading(true)
    setSummaryError(null)

    try {
      const cacheRes = await fetch(`/api/ai-summary/${contentId}`)
      const cacheJson = await cacheRes.json()

      if (cacheJson.cached) {
        setSummaryData({ summary: cacheJson.summary, bullets: cacheJson.bullets ?? [], concepts: cacheJson.concepts ?? [] })
        return
      }

      const res = await fetch(`/api/ai-summary/${contentId}`, { method: 'POST' })
      const json = await res.json()

      if (!res.ok) setSummaryError(json.error ?? 'Failed to generate summary. Try again.')
      else setSummaryData({ summary: json.summary, bullets: json.bullets ?? [], concepts: json.concepts ?? [] })
    } catch {
      setSummaryError('Something went wrong. Try again.')
    } finally {
      setSummaryLoading(false)
    }
  }

  async function loadAssistance(action: AssistanceAction, key: string) {
    if (assistance[action]) return
    setAssistanceLoading(action)
    setAssistanceError(prev => ({ ...prev, [action]: undefined }))

    try {
      const res = await fetch(`/api/ai/content-assistance/${contentId}?action=${action}`, { method: 'POST' })
      const json = await res.json()

      if (json.insufficientContent) {
        setAssistanceError(prev => ({ ...prev, [action]: json.message }))
      } else if (!res.ok) {
        setAssistanceError(prev => ({ ...prev, [action]: json.error ?? 'Failed to generate. Try again.' }))
      } else {
        setAssistance(prev => ({ ...prev, [action]: json.output?.[key] ?? [] }))
      }
    } catch {
      setAssistanceError(prev => ({ ...prev, [action]: 'Something went wrong. Try again.' }))
    } finally {
      setAssistanceLoading(null)
    }
  }

  function selectTab(next: TabKey) {
    setTab(next)
    if (next === 'summary') generateSummary()
    else if (next === 'key_takeaways') loadAssistance('key_takeaways', 'takeaways')
    else if (next === 'action_checklist') loadAssistance('action_checklist', 'checklist')
    else if (next === 'reflection_questions') loadAssistance('reflection_questions', 'questions')
  }

  function handleOpen() {
    setOpen(true)
    selectTab('summary')
  }

  return (
    <>
      <button onClick={handleOpen} style={summaryBlockStyle}>
        <span>✨</span>
        <span>AI Assistant</span>
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
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>AI Assistant</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ border: 'none', background: '#f3f4f6', borderRadius: '9999px', width: '2rem', height: '2rem', fontSize: '1rem', cursor: 'pointer', color: '#374151' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => selectTab(t.key)}
                  style={{
                    padding: '0.375rem 0.75rem', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 600,
                    border: '1px solid', cursor: 'pointer',
                    borderColor: tab === t.key ? '#111827' : '#e5e7eb',
                    background: tab === t.key ? '#111827' : '#fff',
                    color: tab === t.key ? '#fff' : '#374151',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'summary' && (
              <SummaryTab loading={summaryLoading} error={summaryError} data={summaryData} />
            )}
            {tab !== 'summary' && (
              <AssistanceTab
                loading={assistanceLoading === tab}
                error={assistanceError[tab]}
                items={assistance[tab] ?? null}
                emptyLabel={
                  tab === 'key_takeaways' ? 'Key Points' : tab === 'action_checklist' ? 'Checklist' : 'Questions'
                }
              />
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

function SummaryTab({ loading, error, data }: { loading: boolean; error: string | null; data: SummaryData | null }) {
  if (loading) return <LoadingRow label="Generating summary…" />
  if (error) return <ErrorRow message={error} />
  if (!data) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ margin: 0, lineHeight: 1.6, fontSize: '0.9375rem', color: '#374151' }}>{data.summary}</p>

      {data.bullets.length > 0 && (
        <div>
          <p style={sectionLabelStyle}>Key Points</p>
          <ul style={listStyle}>{data.bullets.map((b, i) => <li key={i} style={listItemStyle}>{b}</li>)}</ul>
        </div>
      )}

      {data.concepts.length > 0 && (
        <div>
          <p style={sectionLabelStyle}>Key Concepts</p>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {data.concepts.map((c, i) => (
              <span key={i} style={{ background: '#eef2ff', color: '#4f46e5', fontSize: '0.75rem', fontWeight: 500, padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AssistanceTab({ loading, error, items, emptyLabel }: { loading: boolean; error: string | undefined; items: string[] | null; emptyLabel: string }) {
  if (loading) return <LoadingRow label="Generating…" />
  if (error) return <ErrorRow message={error} />
  if (!items || items.length === 0) return null

  return (
    <div>
      <p style={sectionLabelStyle}>{emptyLabel}</p>
      <ul style={listStyle}>{items.map((item, i) => <li key={i} style={listItemStyle}>{item}</li>)}</ul>
    </div>
  )
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
      {label}
    </div>
  )
}

function ErrorRow({ message }: { message: string }) {
  return <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0, fontStyle: 'italic' }}>{message}</p>
}

const sectionLabelStyle: React.CSSProperties = { margin: '0 0 0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }
const listStyle: React.CSSProperties = { margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }
const listItemStyle: React.CSSProperties = { fontSize: '0.875rem', color: '#374151', lineHeight: 1.5 }
