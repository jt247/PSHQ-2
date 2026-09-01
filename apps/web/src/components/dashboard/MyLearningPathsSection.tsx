import Link from 'next/link'
import { SectionCard, EmptyState, ProgressBar, SeeAllLink } from './DashboardPrimitives'

export interface MyLearningPathItem {
  slug: string
  title: string
  completedModules: number
  remainingModules: number
  isComplete: boolean
}

// Epic D §D.2 — "path title, progress percentage, completed modules,
// remaining modules, continue CTA." One row per path the member has
// actually started (user_learning_paths), real progress from
// module_progress — nothing here is estimated.
export function MyLearningPathsSection({ paths }: { paths: MyLearningPathItem[] }) {
  return (
    <SectionCard title="🧭 My Learning Paths" action={paths.length > 0 ? <SeeAllLink href="/learning-paths" /> : undefined}>
      {paths.length === 0 ? (
        <EmptyState>
          You haven&apos;t started a learning path yet. <Link href="/learning-paths" style={{ color: 'var(--color-ink-deep)', fontWeight: 600 }}>Browse paths →</Link>
        </EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem', padding: '1rem 0' }}>
          {paths.map(p => {
            const total = p.completedModules + p.remainingModules
            const percent = total > 0 ? (p.completedModules / total) * 100 : 0
            return (
              <div key={p.slug} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, color: 'var(--color-ink-deep)', margin: '0 0 0.375rem', fontSize: '0.875rem' }}>
                    {p.title}
                  </p>
                  <ProgressBar percent={percent} />
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--color-text-muted)', margin: '0.3rem 0 0' }}>
                    {p.isComplete ? 'Completed' : `${p.completedModules} done · ${p.remainingModules} remaining`}
                  </p>
                </div>
                <Link href={`/learning-paths/${p.slug}`} className="btn-outline" style={{ flexShrink: 0, fontSize: '0.75rem', padding: '0.4rem 0.875rem' }}>
                  {p.isComplete ? 'Review' : 'Continue'} →
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}
