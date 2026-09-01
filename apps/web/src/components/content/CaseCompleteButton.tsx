'use client'

import { useState, useTransition } from 'react'
import { toggleCaseCompleteAction } from '@/app/(public)/cases/[slug]/actions'

export function CaseCompleteButton({ caseId, initialComplete, isLoggedIn }: { caseId: string; initialComplete: boolean; isLoggedIn: boolean }) {
  const [complete, setComplete] = useState(initialComplete)
  const [isPending, startTransition] = useTransition()

  if (!isLoggedIn) {
    return (
      <a href="/sign-in" className="btn-secondary" title="Sign in to track progress">
        Mark as Complete
      </a>
    )
  }

  return (
    <button
      onClick={() => startTransition(async () => {
        const next = !complete
        setComplete(next)
        const result = await toggleCaseCompleteAction(caseId, next)
        if (result.error) setComplete(!next)
      })}
      disabled={isPending}
      className={complete ? 'btn-primary' : 'btn-secondary'}
    >
      {complete ? '✓ Completed' : 'Mark as Complete'}
    </button>
  )
}
