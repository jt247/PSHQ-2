import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@pshq/api-client/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

export const metadata: Metadata = {
  title: 'Open PM Curriculum — Free, Structured PM Education',
  description: 'A freely available, structured curriculum covering product fundamentals, discovery, strategy, execution, analytics, GTM, AI, leadership, and career practice — built for product practitioners.',
  alternates: { canonical: '/initiatives/open-pm-curriculum' },
}

interface Pathway {
  slug: string
  title: string
  description: string | null
  status: 'live' | 'coming_soon'
  display_order: number
}

async function getPathways(): Promise<Pathway[]> {
  const service = createServiceClient()
  const { data } = await service.from('curriculum_pathways').select('slug, title, description, status, display_order').order('display_order')
  return (data ?? []) as Pathway[]
}

export default async function OpenPmCurriculumPage() {
  const pathways = await getPathways()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/initiatives" />

      <main style={{ flex: 1, maxWidth: '64rem', margin: '0 auto', width: '100%', padding: '5rem var(--spacing-margin-edge)' }}>
        <p className="text-label-sm" style={{ color: 'var(--color-accent-warm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Initiative · Interim version, actively developed</p>
        <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '1rem' }}>Open PM Curriculum</h1>
        <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', maxWidth: '58ch', marginBottom: '1rem' }}>
          The comprehensive, canonical product education resource — distinct from a Learning Path, which targets one specific outcome. This is everything.
        </p>
        <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', maxWidth: '58ch', marginBottom: '3rem', fontStyle: 'italic' }}>
          General PM is drafted as a full interim curriculum today. JT is actively writing and expanding the other five pathways with his own material — this page updates as that lands.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
          {pathways.map(p => (
            <Link key={p.slug} href={`/initiatives/open-pm-curriculum/${p.slug}`} style={{
              display: 'block', textDecoration: 'none', padding: '1.5rem',
              border: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)',
              borderRadius: '0.5rem',
            }}>
              <span className="badge" style={{ background: p.status === 'live' ? '#dcfce7' : 'var(--color-paper-darker)', color: p.status === 'live' ? '#15803d' : 'var(--color-ink-deep)', marginBottom: '0.75rem', display: 'inline-block' }}>
                {p.status === 'live' ? 'Live' : 'Coming Soon'}
              </span>
              <p className="text-body-lg" style={{ fontWeight: 700, color: 'var(--color-ink-deep)', marginBottom: '0.375rem' }}>{p.title}</p>
              {p.description && <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>{p.description}</p>}
            </Link>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
