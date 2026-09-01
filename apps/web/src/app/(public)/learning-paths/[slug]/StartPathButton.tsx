'use client'

import { useTransition } from 'react'
import { startPathAction } from './actions'

export function StartPathButton({ pathId, pathSlug }: { pathId: string; pathSlug: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      onClick={() => startTransition(() => startPathAction(pathId, pathSlug))}
      disabled={pending}
      className="btn-accent"
    >
      {pending ? 'Starting…' : 'Start Path →'}
    </button>
  )
}
