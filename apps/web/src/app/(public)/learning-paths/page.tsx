import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@pshq/api-client/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

export const metadata: Metadata = {
  title: 'Learning Paths — Structured, Outcome-Focused Courses',
  description: 'Ordered learning paths assembled from real Product Slice HQ resources — Product Management Fundamentals, Become an AI Product Manager, and Build Your First Product With AI.',
  alternates: { canonical: '/learning-paths' },
}

interface Path {
  id: string
  slug: string
  title: string
  description: string | null
  level: string | null
  estimated_time_minutes: number | null
  module_count: number
}

async function getPaths(): Promise<Path[]> {
  const service = createServiceClient()
  const { data } = await service
    .from('learning_paths')
    .select('id, slug, title, description, level, estimated_time_minutes, display_order, learning_path_modules(count)')
    .eq('status', 'published')
    .order('display_order')

  return (data ?? []).map(row => ({
    id: row.id, slug: row.slug, title: row.title, description: row.description,
    level: row.level, estimated_time_minutes: row.estimated_time_minutes,
    module_count: (row.learning_path_modules as unknown as { count: number }[])?.[0]?.count ?? 0,
  }))
}

export default async function LearningPathsPage() {
  const paths = await getPaths()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/learning-paths" />

      <main style={{ flex: 1, maxWidth: '64rem', margin: '0 auto', width: '100%', padding: '5rem var(--spacing-margin-edge)' }}>
        <section style={{ maxWidth: '48ch', marginBottom: '3rem' }}>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.875rem' }}>Learning Paths</h1>
          <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
            Ordered routes through real Product Slice HQ resources, built toward one specific outcome.
          </p>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
          {paths.map(p => (
            <Link key={p.id} href={`/learning-paths/${p.slug}`} style={{
              display: 'block', textDecoration: 'none', padding: '1.5rem',
              border: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)',
              borderRadius: '0.5rem',
            }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                {p.level && <span className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-ink-deep)', textTransform: 'capitalize' }}>{p.level}</span>}
                <span className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-ink-deep)' }}>{p.module_count} modules</span>
                {p.estimated_time_minutes && <span className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-ink-deep)' }}>{p.estimated_time_minutes} min</span>}
              </div>
              <p className="text-body-lg" style={{ fontWeight: 700, color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>{p.title}</p>
              {p.description && <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>{p.description}</p>}
            </Link>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
