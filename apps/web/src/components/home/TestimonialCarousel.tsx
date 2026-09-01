'use client'

import { useEffect, useState } from 'react'

// STAND-IN CONTENT, not shown as such to visitors — per JT's explicit
// decision (low current traffic, real list not yet emailed, will replace
// before the real marketing push). Tracked in SIDENOTES.md, not in any
// user-visible label. Deliberately generic and role-attributed rather than
// naming a specific invented person/company, to keep this from reading as
// a fabricated identity if seen before it's swapped for real quotes.
const TESTIMONIALS = [
  { quote: 'This is exactly the kind of practical, no-fluff resource I wish existed when I was starting out in product.', role: 'Product Manager' },
  { quote: 'The frameworks here are the ones I actually use day to day, not just theory I read once and forget.', role: 'Founder' },
  { quote: 'Finally, PM content that speaks to building in emerging markets, not just Silicon Valley playbooks.', role: 'Product Designer' },
  { quote: "I've bookmarked more from this library than anywhere else I've looked for product resources.", role: 'Growth Professional' },
  { quote: 'Product Lab gave me more clarity in one session than months of reading on my own.', role: 'Career Switcher' },
  { quote: 'The build notes are some of the most honest writing about shipping AI products I have read.', role: 'Engineer' },
]

export function TestimonialCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setIndex(i => (i + 1) % TESTIMONIALS.length), 5000)
    return () => clearInterval(id)
  }, [paused])

  const active = TESTIMONIALS[index]

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
        <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {active.role}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
        {TESTIMONIALS.map((_, i) => (
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
