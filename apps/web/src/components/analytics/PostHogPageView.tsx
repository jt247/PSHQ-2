'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { posthog } from '@/lib/posthog/client'

function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    const search = searchParams.toString()
    const url = search ? `${pathname}?${search}` : pathname
    posthog.capture('$pageview', { $current_url: window.location.origin + url })
  }, [pathname, searchParams])

  return null
}

// Wrapped in Suspense because useSearchParams requires it in the App Router.
export function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  )
}
