'use client'

import { useState, useTransition } from 'react'
import { toggleCaseFavoriteAction } from '@/app/(public)/cases/[slug]/actions'

interface Props {
  caseId: string
  initialFavorited: boolean
  isLoggedIn: boolean
}

// Same UI/behavior as FavoriteButton, pointed at case_favorites instead of
// content_favorites — see actions.ts for why cases need their own action.
export function CaseFavoriteButton({ caseId, initialFavorited, isLoggedIn }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [isPending, startTransition] = useTransition()

  if (!isLoggedIn) {
    return (
      <a href="/sign-in" style={btnStyle(false)} title="Sign in to save favorites">
        ☆ Favorite
      </a>
    )
  }

  function handleClick() {
    const wasFavorited = favorited
    startTransition(async () => {
      setFavorited(!wasFavorited)
      const result = await toggleCaseFavoriteAction(caseId, wasFavorited)
      if (result?.error) setFavorited(wasFavorited)
    })
  }

  return (
    <button onClick={handleClick} disabled={isPending} style={btnStyle(favorited)}>
      {favorited ? '★ Favorited' : '☆ Favorite'}
    </button>
  )
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
    padding: '0.4rem 0.875rem',
    border: `1px solid ${active ? '#f59e0b' : '#d1d5db'}`,
    borderRadius: '9999px',
    background: active ? '#fffbeb' : '#fff',
    color: active ? '#b45309' : '#374151',
    fontSize: '0.875rem', fontWeight: 500,
    cursor: 'pointer', textDecoration: 'none',
    transition: 'all 150ms',
  }
}
