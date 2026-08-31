'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface Props {
  initialValue: string
}

// Debounced, URL-driven search. The page itself stays a Server Component —
// this only ever reads and writes the `search` query param, the same way
// the existing type/pricing filter links already do, so the library page's
// server-side rendering and its static canonical are untouched by this.
export function LibrarySearch({ initialValue }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(initialValue)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep the input in sync if the URL changes from elsewhere (back/forward
  // nav, or a filter link resetting the page).
  useEffect(() => {
    setValue(searchParams.get('search') ?? '')
  }, [searchParams])

  function pushSearch(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (next.trim()) params.set('search', next.trim())
    else params.delete('search')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function handleChange(next: string) {
    setValue(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => pushSearch(next), 300)
  }

  return (
    <div style={{ position: 'relative', maxWidth: '28rem' }}>
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }}
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={e => handleChange(e.target.value)}
        placeholder="Search resources by keyword…"
        aria-label="Search the library"
        style={{
          width: '100%',
          minHeight: '44px',
          padding: '0.625rem 1rem 0.625rem 2.5rem',
          borderRadius: '0.25rem',
          border: '1px solid color-mix(in srgb, var(--color-tertiary) 15%, transparent)',
          background: 'var(--color-paper-base)',
          color: 'var(--color-ink-deep)',
          fontSize: '0.9375rem',
          fontFamily: 'var(--font-sans)',
          outline: 'none',
        }}
      />
    </div>
  )
}
