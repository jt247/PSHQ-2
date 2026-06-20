'use client'

import { useState, useTransition } from 'react'
import { toggleUpvoteAction } from '@/app/(public)/articles/[slug]/actions'

interface Props {
  contentId: string
  initialCount: number
  initialUpvoted: boolean
  isLoggedIn: boolean
}

export function UpvoteButton({ contentId, initialCount, initialUpvoted, isLoggedIn }: Props) {
  const [upvoted, setUpvoted] = useState(initialUpvoted)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  if (!isLoggedIn) {
    return (
      <a href="/sign-in" style={btnStyle(false)}>
        ↑ {count} · Sign in to upvote
      </a>
    )
  }

  function handleClick() {
    const wasUpvoted = upvoted
    startTransition(async () => {
      setUpvoted(u => !u)
      setCount(c => wasUpvoted ? c - 1 : c + 1)
      const result = await toggleUpvoteAction(contentId, wasUpvoted)
      if (result?.error) {
        // roll back optimistic update
        setUpvoted(wasUpvoted)
        setCount(c => wasUpvoted ? c + 1 : c - 1)
      }
    })
  }

  return (
    <button onClick={handleClick} disabled={isPending} style={btnStyle(upvoted)}>
      ↑ {count} {upvoted ? 'Upvoted' : 'Upvote'}
    </button>
  )
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
    padding: '0.4rem 0.875rem',
    border: `1px solid ${active ? '#6366f1' : '#d1d5db'}`,
    borderRadius: '9999px',
    background: active ? '#eef2ff' : '#fff',
    color: active ? '#4f46e5' : '#374151',
    fontSize: '0.875rem', fontWeight: 500,
    cursor: 'pointer', textDecoration: 'none',
    transition: 'all 150ms',
  }
}
