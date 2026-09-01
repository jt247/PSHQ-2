'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { autoMarkContentCompleteAction } from '@/app/(public)/content/[slug]/actions'

const MIN_DWELL_MS = 20_000
const SCROLL_THRESHOLD_RATIO = 0.85

interface Props {
  contentId: string
  isLoggedIn: boolean
  alreadyComplete: boolean
}

// Epic D §D.5 — "automatic completion when objective consumption
// thresholds are met (scroll depth or time on page)." Renders nothing;
// it's a detector, not UI. Fires once per mount at most. Both conditions
// (scrolled most of the way down AND spent a minimum real amount of time)
// have to be true — scroll depth alone rewards someone who jumps straight
// to the bottom, dwell time alone rewards someone who opens a tab and
// walks away, neither one alone is an honest "actually read this" signal.
export function AutoCompleteTracker({ contentId, isLoggedIn, alreadyComplete }: Props) {
  const router = useRouter()
  const firedRef = useRef(false)
  const dwellMetRef = useRef(false)
  const scrolledEnoughRef = useRef(false)

  useEffect(() => {
    if (!isLoggedIn || alreadyComplete) return

    const dwellTimer = setTimeout(() => {
      dwellMetRef.current = true
      maybeFire()
    }, MIN_DWELL_MS)

    function maybeFire() {
      if (firedRef.current || !dwellMetRef.current || !scrolledEnoughRef.current) return
      firedRef.current = true
      window.removeEventListener('scroll', handleScroll)
      autoMarkContentCompleteAction(contentId).then(result => {
        if (!result.error && !result.skipped) router.refresh()
      })
    }

    function handleScroll() {
      const doc = document.documentElement
      const scrolled = (window.scrollY + window.innerHeight) / doc.scrollHeight
      if (scrolled >= SCROLL_THRESHOLD_RATIO) {
        scrolledEnoughRef.current = true
        maybeFire()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // covers a page short enough to already be past threshold on load

    return () => {
      clearTimeout(dwellTimer)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [contentId, isLoggedIn, alreadyComplete, router])

  return null
}
