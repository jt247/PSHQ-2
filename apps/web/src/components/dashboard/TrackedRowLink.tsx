'use client'

import Link from 'next/link'
import { createClient } from '@pshq/api-client/client'
import { trackAiRecommendationClicked } from '@pshq/analytics'
import type { ReactNode } from 'react'

// ai_recommendation_clicked (Epic E analytics) — fires on click, doesn't
// block navigation. userId comes down as a prop from the server component
// that already has it, so this never needs its own auth round-trip.
export function TrackedRowLink({ href, isLast, userId, slot, contentId, children }: {
  href: string
  isLast: boolean
  userId: string
  slot: 'recommended_for_you' | 'new_for_you'
  contentId: string
  children: ReactNode
}) {
  function handleClick() {
    const supabase = createClient()
    trackAiRecommendationClicked({ supabase, source: 'web', userId }, slot, { contentId }).catch(() => {})
  }

  return (
    <Link href={href} onClick={handleClick} style={{
      display: 'flex', alignItems: 'center', gap: '0.875rem',
      padding: '0.75rem 0',
      borderBottom: isLast ? 'none' : '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)',
      textDecoration: 'none',
    }}>
      {children}
    </Link>
  )
}
