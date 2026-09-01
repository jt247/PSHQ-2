export interface LearningActivityCounts {
  articlesCompleted: number
  resourcesCompleted: number
  ebooksRead: number
  modulesCompleted: number
  casesCompleted: number
  streak: number
}

// Epic D §D.2 — real completion counts from content_progress/
// module_progress/case_progress, grouped by type. Zeroes for a new member
// are correct data, not a broken section.
export function LearningActivitySection({ counts }: { counts: LearningActivityCounts }) {
  const stats = [
    { label: 'Articles Completed', value: counts.articlesCompleted },
    { label: 'Resources Completed', value: counts.resourcesCompleted },
    { label: 'E-books Read', value: counts.ebooksRead },
    { label: 'Modules Completed', value: counts.modulesCompleted },
    { label: 'Cases Completed', value: counts.casesCompleted },
    { label: 'Day Streak', value: counts.streak },
  ]

  return (
    <section>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-ink-deep)', margin: '0 0 1rem' }}>
        Learning Activity
      </h2>
      <div className="grid-collapse-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem' }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: '#ffffff',
            border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
            borderRadius: '0.625rem', padding: '1rem', textAlign: 'center',
          }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink-deep)', margin: '0 0 0.25rem' }}>
              {s.value}
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
