'use client'

import { useState } from 'react'
import Link from 'next/link'

// Design Brief §4 — "give the homepage at least one genuinely interactive
// element instead of only static cards to read." One question, phrased as
// a real scenario rather than repeating the six labels verbatim (that's
// the Choose Your Direction grid right above this), mapped 1:1 to the same
// six real directions — no invented content, no fake recommendation logic.
const SCENARIOS = [
  { slug: 'careers', label: "I'm trying to break into product management" },
  { slug: 'product', label: 'I already PM and want to sharpen the craft' },
  { slug: 'growth', label: 'I need to grow or retain users' },
  { slug: 'ai', label: "I'm figuring out AI in real products" },
  { slug: 'building', label: "I'm shipping and want to build faster" },
  { slug: 'leadership', label: 'I lead a team, or want to' },
] as const

export function DirectionPicker() {
  const [picked, setPicked] = useState<(typeof SCENARIOS)[number] | null>(null)

  return (
    <div>
      <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>
        Not sure where to start?
      </p>
      <h2 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '1.75rem' }}>
        Which sounds most like you right now?
      </h2>

      {!picked ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '0.875rem' }}>
          {SCENARIOS.map(s => (
            <button
              key={s.slug}
              onClick={() => setPicked(s)}
              className="text-body-md"
              style={{
                textAlign: 'left', padding: '1.25rem', borderRadius: '0.5rem', cursor: 'pointer',
                border: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)',
                background: 'var(--color-paper-darker)', color: 'var(--color-ink-deep)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : (
        <div style={{
          padding: '2rem', borderRadius: '0.75rem', background: 'var(--color-ink-deep)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem',
        }}>
          <p className="text-body-lg" style={{ color: '#fff', margin: 0 }}>
            Start with <strong>{DIRECTION_LABEL[picked.slug]}</strong>.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href={`/explore/${picked.slug}`} style={{
              display: 'inline-flex', alignItems: 'center', background: '#FACC15', color: '#0E2A47',
              fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.9375rem', padding: '0.75rem 1.5rem',
              borderRadius: '0.25rem', textDecoration: 'none',
            }}>
              Explore {DIRECTION_LABEL[picked.slug]} →
            </Link>
            <button
              onClick={() => setPicked(null)}
              className="text-label-sm"
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '0.75rem 0' }}
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const DIRECTION_LABEL: Record<string, string> = {
  product: 'Product', growth: 'Growth', ai: 'AI', building: 'Building', careers: 'Careers', leadership: 'Leadership',
}
