'use client'

import { useState } from 'react'
import { logShareAction } from '@/app/(public)/content/[slug]/actions'

interface Props {
  contentId: string
  title: string
  url: string
  variant?: 'primary' | 'outline'
}

// Native Web Share API where it's supported (opens the OS share sheet on
// phones, and on desktop Chrome/Edge that support it too). Falls back to
// copying the link — there is no share sheet on desktop Firefox/Safari, and
// a silent no-op there would look broken.
type ShareStatus = 'idle' | 'copied' | 'failed'

export function ShareButton({ contentId, title, url, variant = 'outline' }: Props) {
  const [status, setStatus] = useState<ShareStatus>('idle')

  function resetSoon() {
    setTimeout(() => setStatus('idle'), 2500)
  }

  async function handleShare() {
    logShareAction(contentId).catch(() => {})

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // AbortError when the user dismisses the sheet — not a failure,
        // nothing to fall back to.
        return
      }
    }

    // A denied or unavailable Clipboard API used to fail here with no
    // visible feedback at all — the button just did nothing, which reads as
    // broken rather than as "this browser won't let us copy for you."
    try {
      await navigator.clipboard.writeText(url)
      setStatus('copied')
      resetSoon()
    } catch {
      setStatus('failed')
      resetSoon()
    }
  }

  const isPrimary = variant === 'primary'
  const label = status === 'copied' ? 'Link copied!' : status === 'failed' ? `Copy failed — copy manually: ${url}` : 'Share'

  return (
    <button
      type="button"
      onClick={handleShare}
      className={isPrimary ? 'btn-primary' : 'btn-outline'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%',
        ...(status === 'failed' ? { fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } : {}),
      }}
      title={status === 'failed' ? url : undefined}
    >
      {status === 'idle' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
        </svg>
      )}
      {label}
    </button>
  )
}
