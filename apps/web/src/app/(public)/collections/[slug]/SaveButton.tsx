'use client'

import { useTransition } from 'react'
import { CheckIcon } from '@/components/icons'
import { toggleCollectionSaveAction } from './actions'

export function SaveButton({ collectionId, slug, isSaved, isSignedIn }: { collectionId: string; slug: string; isSaved: boolean; isSignedIn: boolean }) {
  const [pending, startTransition] = useTransition()

  if (!isSignedIn) {
    return <a href="/sign-in?redirect=/collections" className="btn-secondary">Sign in to save →</a>
  }

  return (
    <button
      onClick={() => startTransition(() => toggleCollectionSaveAction(collectionId, slug, isSaved))}
      disabled={pending}
      className={isSaved ? 'btn-primary' : 'btn-secondary'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
    >
      {isSaved && <CheckIcon size={14} />}
      {isSaved ? 'Saved' : 'Save Collection'}
    </button>
  )
}
