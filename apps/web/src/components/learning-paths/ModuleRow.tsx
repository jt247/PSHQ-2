'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { toggleModuleCompleteAction } from '@/app/(public)/learning-paths/[slug]/actions'

interface Props {
  moduleId: string
  pathId: string
  pathSlug: string
  title: string
  description: string | null
  href: string | null
  isCompleted: boolean
  canTrack: boolean
  sequence: number
}

export function ModuleRow({ moduleId, pathId, pathSlug, title, description, href, isCompleted, canTrack, sequence }: Props) {
  const [pending, startTransition] = useTransition()

  function toggle() {
    startTransition(() => toggleModuleCompleteAction(moduleId, pathId, pathSlug, !isCompleted))
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem',
      border: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)',
      borderRadius: '0.5rem',
    }}>
      {canTrack ? (
        <button
          onClick={toggle}
          disabled={pending}
          aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
          style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: '0.125rem',
            border: `2px solid ${isCompleted ? '#15803d' : 'var(--color-text-muted)'}`,
            background: isCompleted ? '#15803d' : 'transparent',
            color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isCompleted ? '✓' : ''}
        </button>
      ) : (
        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: '0.125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-paper-darker)', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>
          {sequence}
        </div>
      )}
      <div style={{ flex: 1 }}>
        {href ? (
          <Link href={href} className="text-body-md" style={{ fontWeight: 600, color: 'var(--color-ink-deep)', textDecoration: 'none' }}>{title}</Link>
        ) : (
          <p className="text-body-md" style={{ fontWeight: 600, color: 'var(--color-ink-deep)', margin: 0 }}>{title}</p>
        )}
        {description && <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>{description}</p>}
      </div>
    </div>
  )
}
