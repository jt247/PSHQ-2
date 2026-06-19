'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createRequestAction, type RequestState } from '../actions'

const CONTENT_TYPES = ['Article', 'Ebook', 'Template', 'Course', 'Video', 'Webinar', 'Case Study', 'Other']
const initState: RequestState = {}

export default function NewRequestPage() {
  const [state, formAction, isPending] = useActionState(createRequestAction, initState)
  const router = useRouter()

  useEffect(() => {
    if (state.success) router.push('/dashboard/requests')
  }, [state.success, router])

  return (
    <div style={page}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/dashboard/requests" style={backLink}>← Back to requests</Link>
        <h1 style={h1}>Request content</h1>
      </div>

      <form action={formAction} style={formStyle}>
        <div style={field}>
          <label style={label}>Title</label>
          <input name="title" required placeholder="What content would you like?" style={input} maxLength={200} />
        </div>

        <div style={field}>
          <label style={label}>Content type</label>
          <select name="content_type_requested" style={input}>
            <option value="">Select type…</option>
            {CONTENT_TYPES.map(t => <option key={t} value={t.toLowerCase()}>{t}</option>)}
          </select>
        </div>

        <div style={field}>
          <label style={label}>Description</label>
          <textarea
            name="description" rows={5}
            placeholder="Describe what you'd like to learn or what problem this content should solve…"
            style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }}
            maxLength={2000}
          />
        </div>

        {state.error && <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: 0 }}>{state.error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button type="submit" disabled={isPending} style={btnPrimary}>
            {isPending ? 'Submitting…' : 'Submit request'}
          </button>
          <Link href="/dashboard/requests" style={{ color: '#6b7280', fontSize: '0.875rem' }}>Cancel</Link>
        </div>
      </form>
    </div>
  )
}

const page: React.CSSProperties = { maxWidth: '600px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif' }
const h1: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }
const backLink: React.CSSProperties = { fontSize: '0.8125rem', color: '#6b7280', textDecoration: 'none', display: 'block', marginBottom: '0.375rem' }
const formStyle: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' }
const label: React.CSSProperties = { fontSize: '0.875rem', fontWeight: 500, color: '#374151' }
const input: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9375rem', outline: 'none', width: '100%', boxSizing: 'border-box' }
const btnPrimary: React.CSSProperties = { padding: '0.5rem 1.25rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }
