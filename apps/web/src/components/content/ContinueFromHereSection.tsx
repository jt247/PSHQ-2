'use client'

import Link from 'next/link'
import type { ContinueFromHereItem } from '@pshq/api-client/ai'
import { trackRelatedClickAction } from './actions'

const HREF_BY_TYPE: Record<string, (slug: string) => string> = {
  article: slug => `/articles/${slug}`,
  build_note: slug => `/build-notes/${slug}`,
  case: slug => `/cases/${slug}`,
  collection: slug => `/collections/${slug}`,
  learning_path: slug => `/learning-paths/${slug}`,
}

// Epic E §E.7 — Layer 1 only (pure metadata lookup, no AI call), shown at
// the end of every content page. 3-5 real, prioritized items or nothing
// at all — never a placeholder row.
// Epic H §H.1 — "use client" only added so a click can fire
// trackRelatedContentClicked fire-and-forget before navigating; nothing
// else about this component's rendering changed.
export function ContinueFromHereSection({ items, fromContentId }: { items: ContinueFromHereItem[]; fromContentId: string }) {
  if (items.length === 0) return null

  return (
    <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)' }}>
      <h2 className="text-label-sm" style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
        Continue From Here
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {items.map(item => (
          <Link
            key={item.id}
            href={(HREF_BY_TYPE[item.type] ?? ((s: string) => `/content/${s}`))(item.slug)}
            onClick={() => { void trackRelatedClickAction(fromContentId, item.id) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.875rem 1rem', borderRadius: '0.5rem',
              border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
              textDecoration: 'none',
            }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', margin: '0 0 0.2rem' }}>{item.reason}</p>
              <p className="text-body-md" style={{ color: 'var(--color-ink-deep)', fontWeight: 600, margin: 0 }}>{item.title}</p>
            </div>
            <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>→</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
