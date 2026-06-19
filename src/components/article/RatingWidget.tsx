'use client'

import { useState, useActionState } from 'react'
import { submitRatingAction, type RatingState } from '@/app/(public)/articles/[slug]/actions'

interface Props {
  contentId: string
  isLoggedIn: boolean
  existingRating?: number | null
  existingReview?: string | null
}

const initState: RatingState = {}

export function RatingWidget({ contentId, isLoggedIn, existingRating, existingReview }: Props) {
  const [hovered, setHovered] = useState(0)
  const [selected, setSelected] = useState(existingRating ?? 0)

  const boundAction = submitRatingAction.bind(null, contentId)
  const [state, formAction, isPending] = useActionState(boundAction, initState)

  if (!isLoggedIn) {
    return (
      <div style={widgetStyle}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
          <a href="/sign-in" style={{ color: '#6366f1' }}>Sign in</a> to rate this content.
        </p>
      </div>
    )
  }

  const display = hovered || selected

  return (
    <div style={widgetStyle}>
      <p style={{ margin: '0 0 0.625rem', fontWeight: 600, fontSize: '0.9375rem', color: '#111827' }}>
        {existingRating ? 'Update your rating' : 'Rate this content'}
      </p>

      <form action={formAction}>
        <input type="hidden" name="rating" value={selected} />
        <input type="hidden" name="review_text" id="review_text_hidden" />

        {/* Stars */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setSelected(n)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '1.5rem', padding: '0 0.1rem',
                color: n <= display ? '#f59e0b' : '#d1d5db',
                transition: 'color 100ms',
              }}
              aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
          {selected > 0 && (
            <span style={{ fontSize: '0.8125rem', color: '#6b7280', alignSelf: 'center', marginLeft: '0.25rem' }}>
              {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][selected]}
            </span>
          )}
        </div>

        {/* Optional review */}
        <ReviewTextarea defaultValue={existingReview ?? ''} />

        {state.error && (
          <p style={{ color: '#b91c1c', fontSize: '0.8125rem', margin: '0.25rem 0' }}>{state.error}</p>
        )}
        {state.success && (
          <p style={{ color: '#15803d', fontSize: '0.8125rem', margin: '0.25rem 0' }}>Rating saved!</p>
        )}

        <button
          type="submit"
          disabled={isPending || selected === 0}
          style={{
            marginTop: '0.5rem',
            padding: '0.375rem 0.875rem',
            background: selected > 0 ? '#111827' : '#e5e7eb',
            color: selected > 0 ? '#fff' : '#9ca3af',
            border: 'none', borderRadius: '6px',
            fontSize: '0.875rem', fontWeight: 500,
            cursor: selected > 0 && !isPending ? 'pointer' : 'not-allowed',
          }}
        >
          {isPending ? 'Saving…' : existingRating ? 'Update rating' : 'Submit rating'}
        </button>
      </form>
    </div>
  )
}

// Separate component to avoid stale closure on textarea value
function ReviewTextarea({ defaultValue }: { defaultValue: string }) {
  return (
    <textarea
      name="review_text"
      placeholder="Add a written review (optional)"
      defaultValue={defaultValue}
      maxLength={500}
      rows={2}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '0.5rem 0.625rem',
        border: '1px solid #e5e7eb', borderRadius: '6px',
        fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical',
        outline: 'none', color: '#374151',
      }}
    />
  )
}

const widgetStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '1rem 1.125rem',
}
