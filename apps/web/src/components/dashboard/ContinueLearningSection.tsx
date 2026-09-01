import { SectionCard, EmptyState, RowLink, ProgressBar, TYPE_LABELS, hrefFor } from './DashboardPrimitives'

export interface ContinueLearningPath {
  slug: string
  title: string
  completedModules: number
  totalModules: number
}

export interface ContinueLearningItem {
  id: string
  title: string
  type: string
  slug: string
}

interface Props {
  path: ContinueLearningPath | null
  items: ContinueLearningItem[]
}

// Epic D §D.2 — "last learning path, last article, last ebook, last case
// study, prioritizing unfinished structured content." Real empty state
// when a member hasn't started anything yet; no placeholder content.
export function ContinueLearningSection({ path, items }: Props) {
  const hasAnything = path || items.length > 0

  return (
    <SectionCard title="▶ Continue Learning">
      {!hasAnything ? (
        <EmptyState>Start an article, ebook, or learning path and it&apos;ll show up here.</EmptyState>
      ) : (
        <>
          {path && (
            <RowLink href={`/learning-paths/${path.slug}`} isLast={items.length === 0}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, color: 'var(--color-ink-deep)', margin: '0 0 0.375rem', fontSize: '0.875rem' }}>
                  {path.title}
                </p>
                <ProgressBar percent={path.totalModules > 0 ? (path.completedModules / path.totalModules) * 100 : 0} />
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--color-text-muted)', margin: '0.3rem 0 0' }}>
                  {path.completedModules} of {path.totalModules} modules
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>Continue →</span>
            </RowLink>
          )}
          {items.map((item, i) => (
            <RowLink key={item.id} href={hrefFor(item.type, item.slug)} isLast={i === items.length - 1}>
              <span className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                {TYPE_LABELS[item.type] ?? item.type}
              </span>
              <span style={{ fontFamily: 'var(--font-sans)', flex: 1, color: 'var(--color-ink-deep)', fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.title}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>→</span>
            </RowLink>
          ))}
        </>
      )}
    </SectionCard>
  )
}
