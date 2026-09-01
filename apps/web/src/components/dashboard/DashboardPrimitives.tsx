import Link from 'next/link'
import type { ReactNode } from 'react'

// Shared building blocks for the My ProductSlice dashboard sections (Epic
// D §D.2) — extracted so each section component stays focused on its own
// data/empty-state logic instead of re-declaring the same card chrome ten
// times over.

export function SectionCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section style={{
      background: '#ffffff',
      border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
      borderRadius: '0.75rem', overflow: 'hidden',
    }}>
      <div style={{
        padding: '1.25rem 1.5rem 1rem',
        borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 6%, transparent)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
          fontWeight: 700, color: 'var(--color-ink-deep)',
          margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {title}
        </h3>
        {action}
      </div>
      <div style={{ padding: '0 1.5rem' }}>{children}</div>
    </section>
  )
}

export function SeeAllLink({ href, label = 'See all →' }: { href: string; label?: string }) {
  return (
    <Link href={href} style={{
      fontSize: '0.75rem', color: 'var(--color-text-muted)',
      textDecoration: 'none', fontFamily: 'var(--font-sans)', fontWeight: 600,
    }}>
      {label}
    </Link>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p style={{ padding: '1.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)' }}>
      {children}
    </p>
  )
}

export function RowLink({ href, isLast, children }: { href: string; isLast: boolean; children: ReactNode }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: '0.875rem',
      padding: '0.75rem 0',
      borderBottom: isLast ? 'none' : '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)',
      textDecoration: 'none',
    }}>
      {children}
    </Link>
  )
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div style={{ height: '5px', borderRadius: '3px', background: 'var(--color-paper-darker)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, percent))}%`, background: 'var(--color-accent-warm)', borderRadius: '3px' }} />
    </div>
  )
}

export const TYPE_LABELS: Record<string, string> = {
  article: 'Article', ebook: 'E-book', template: 'Template', course: 'Course',
  guide: 'Guide', build_note: 'Build Note', case: 'Case Study', collection: 'Collection',
}

export const HREF_BY_TYPE: Record<string, (slug: string) => string> = {
  article: slug => `/articles/${slug}`,
  build_note: slug => `/build-notes/${slug}`,
  case: slug => `/cases/${slug}`,
  collection: slug => `/collections/${slug}`,
}

export function hrefFor(type: string, slug: string): string {
  return (HREF_BY_TYPE[type] ?? (s => `/content/${s}`))(slug)
}
