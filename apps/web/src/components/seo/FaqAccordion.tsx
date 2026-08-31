'use client'

import { useState } from 'react'

interface FaqItem {
  question: string
  answer: string
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div
            key={item.question}
            style={{
              border: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)',
              borderRadius: '0.5rem',
              background: 'var(--color-paper-base)',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '1.125rem 1.25rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-sans)',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--color-ink-deep)',
                minHeight: '44px',
              }}
            >
              {item.question}
              <span aria-hidden="true" style={{ flexShrink: 0, transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 150ms', fontSize: '1.25rem', color: 'var(--color-text-muted)' }}>
                +
              </span>
            </button>
            {isOpen && (
              <p style={{
                padding: '0 1.25rem 1.125rem',
                margin: 0,
                fontFamily: 'var(--font-sans)',
                fontSize: '0.9375rem',
                lineHeight: 1.7,
                color: 'var(--color-text-muted)',
              }}>
                {item.answer}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
