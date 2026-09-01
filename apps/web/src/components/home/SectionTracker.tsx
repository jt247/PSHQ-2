'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@pshq/api-client/client'
import { trackHomepageSectionViewed } from '@pshq/analytics'

// Fires homepage_section_viewed exactly once per section per page load, the
// moment that section actually scrolls into view — not on page load for
// every section regardless of whether the visitor ever scrolled that far.
export function SectionTracker({ section }: { section: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const fired = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      async (entries) => {
        if (fired.current) return
        const entry = entries[0]
        if (entry.isIntersecting) {
          fired.current = true
          observer.disconnect()
          try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            await trackHomepageSectionViewed({ supabase, source: 'web', userId: user?.id ?? null }, section)
          } catch { /* analytics is never allowed to break the page */ }
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [section])

  // Zero-height sentinel — sits at the top of the section it's tracking,
  // doesn't affect layout.
  return <div ref={ref} aria-hidden="true" style={{ height: 0 }} />
}
