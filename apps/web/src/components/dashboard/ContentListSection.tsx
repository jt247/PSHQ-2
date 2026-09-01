import { SectionCard, EmptyState, RowLink, TYPE_LABELS, hrefFor } from './DashboardPrimitives'

export interface DashboardListItem {
  id: string
  title: string
  type: string
  slug: string
  tags?: string[]
}

// Shared row-list renderer for the several dashboard sections that are
// "a title, a type badge, an arrow" — Recommended For You, New For You,
// Recently Viewed. Keeping one implementation means a styling fix lands
// everywhere at once instead of three times.
export function ContentListSection({
  title, items, emptyText, seeAllHref,
}: {
  title: string
  items: DashboardListItem[]
  emptyText: string
  seeAllHref?: { href: string; label: string }
}) {
  return (
    <SectionCard
      title={title}
      action={seeAllHref && items.length > 0 ? (
        <a href={seeAllHref.href} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textDecoration: 'none', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
          {seeAllHref.label}
        </a>
      ) : undefined}
    >
      {items.length === 0 ? (
        <EmptyState>{emptyText}</EmptyState>
      ) : items.map((item, i) => (
        <RowLink key={item.id} href={hrefFor(item.type, item.slug)} isLast={i === items.length - 1}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              fontFamily: 'var(--font-sans)', fontWeight: 500,
              color: 'var(--color-ink-deep)', margin: 0,
              fontSize: '0.875rem', lineHeight: 1.4,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
            }}>
              {item.title}
            </p>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
              {TYPE_LABELS[item.type] ?? item.type}{item.tags?.[0] ? ` · ${item.tags[0]}` : ''}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>→</span>
        </RowLink>
      ))}
    </SectionCard>
  )
}
