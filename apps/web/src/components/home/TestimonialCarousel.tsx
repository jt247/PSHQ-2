'use client'

import { useEffect, useState } from 'react'

// PLACEHOLDER CONTENT — none of these are real member testimonials. JT
// asked for the interactive section built now so the UI is ready, with
// real quotes swapped in later (see SIDENOTES.md — "Community Proof
// placeholders"). Deliberately generic/labeled as samples rather than
// written to sound like a specific real person, per the standing rule
// against fabricating quotes that could pass as genuine.
const PLACEHOLDERS = [
  { quote: 'Placeholder testimonial 1 — replace with a real member quote before this ships to real visitors.', name: 'Member Name', role: 'Role — Company' },
  { quote: 'Placeholder testimonial 2 — replace with a real member quote before this ships to real visitors.', name: 'Member Name', role: 'Role — Company' },
  { quote: 'Placeholder testimonial 3 — replace with a real member quote before this ships to real visitors.', name: 'Member Name', role: 'Role — Company' },
  { quote: 'Placeholder testimonial 4 — replace with a real member quote before this ships to real visitors.', name: 'Member Name', role: 'Role — Company' },
  { quote: 'Placeholder testimonial 5 — replace with a real member quote before this ships to real visitors.', name: 'Member Name', role: 'Role — Company' },
  { quote: 'Placeholder testimonial 6 — replace with a real member quote before this ships to real visitors.', name: 'Member Name', role: 'Role — Company' },
]

export function TestimonialCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setIndex(i => (i + 1) % PLACEHOLDERS.length), 5000)
    return () => clearInterval(id)
  }, [paused])

  const active = PLACEHOLDERS[index]

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ maxWidth: '48rem', margin: '0 auto' }}
    >
      <div style={{
        padding: '2.5rem', borderRadius: '0.75rem', background: 'var(--color-paper-darker)',
        border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
        minHeight: '11rem', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        transition: 'opacity 300ms',
      }}>
        <p className="text-headline-sm" style={{ color: 'var(--color-ink-deep)', marginBottom: '1.25rem', lineHeight: 1.6, fontStyle: 'italic' }}>
          &ldquo;{active.quote}&rdquo;
        </p>
        <div>
          <p className="text-body-md" style={{ fontWeight: 700, color: 'var(--color-ink-deep)', margin: 0 }}>{active.name}</p>
          <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', margin: 0 }}>{active.role}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
        {PLACEHOLDERS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Show testimonial ${i + 1}`}
            style={{
              width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
              background: i === index ? 'var(--color-ink-deep)' : 'color-mix(in srgb, var(--color-tertiary) 25%, transparent)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
