'use client'

import { useState, useTransition } from 'react'
import { toggleNotificationPreferenceAction } from '@/app/dashboard/actions'

// Epic D §D.7 member-facing notification types. Admin-side sending/
// segmentation (Epic G) is out of scope — this is only the member's own
// on/off control per type, respected by whatever notification sending
// exists today.
export const NOTIFICATION_TYPES = [
  { key: 'recommended_content', label: 'New recommended content', description: 'When something matches your topics or goals.' },
  { key: 'learning_progress', label: 'Learning progress', description: 'Milestones on your learning paths.' },
  { key: 'new_achievement', label: 'New achievement', description: 'When you earn a badge or milestone.' },
  { key: 'product_lab_reminder', label: 'Product Lab reminder', description: 'Upcoming Product Lab with JT sessions.' },
  { key: 'learning_path_update', label: 'Learning path update', description: 'When a path you started adds or changes content.' },
  { key: 'product_announcement', label: 'Product announcement', description: 'New features and platform updates.' },
  { key: 'feedback_response', label: 'Feedback response', description: 'When the team replies to a request or ticket you filed.' },
  { key: 'community_milestone', label: 'Community milestone', description: 'Community-wide activity worth knowing about.' },
] as const

interface Props {
  /** Keys explicitly disabled by the member. Anything not in this set
   * defaults to enabled — no row yet means "hasn't touched this toggle". */
  disabledKeys: string[]
}

export function NotificationPreferences({ disabledKeys }: Props) {
  const [disabled, setDisabled] = useState<Set<string>>(new Set(disabledKeys))
  const [isPending, startTransition] = useTransition()

  function toggle(key: string) {
    const wasEnabled = !disabled.has(key)
    startTransition(async () => {
      setDisabled(prev => {
        const next = new Set(prev)
        wasEnabled ? next.add(key) : next.delete(key)
        return next
      })
      const result = await toggleNotificationPreferenceAction(key, !wasEnabled)
      if (result.error) {
        setDisabled(prev => {
          const next = new Set(prev)
          wasEnabled ? next.delete(key) : next.add(key)
          return next
        })
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {NOTIFICATION_TYPES.map(({ key, label, description }) => {
        const enabled = !disabled.has(key)
        return (
          <label key={key} style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            padding: '0.75rem', borderRadius: '0.5rem',
            border: '1px solid #e5e7eb', cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={enabled}
              disabled={isPending}
              onChange={() => toggle(key)}
              style={{ marginTop: '0.2rem', width: '1rem', height: '1rem', flexShrink: 0 }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{label}</p>
              <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>{description}</p>
            </div>
          </label>
        )
      })}
    </div>
  )
}
