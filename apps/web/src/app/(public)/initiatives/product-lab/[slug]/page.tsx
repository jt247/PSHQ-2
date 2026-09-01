import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@pshq/api-client/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

interface EditionDetail {
  slug: string
  edition_number: string
  title: string
  focus_description: string | null
  long_description: string | null
  status: 'completed' | 'open' | 'coming_soon'
  join_method: 'invitation_email' | 'open' | null
  join_instructions: string | null
  stats: Record<string, string | number>
  event_date: string | null
  speakers: { name: string; role?: string }[]
  learning_objectives: string[]
  agenda: { time?: string; item: string }[]
  recording_url: string | null
  slides_url: string | null
  resources: { label: string; url: string }[]
  images: string[]
  pricing: string
  registration_url: string | null
  replay_url: string | null
}

async function getEdition(slug: string): Promise<EditionDetail | null> {
  const service = createServiceClient()
  const { data } = await service.from('initiative_editions').select('*').eq('slug', slug).maybeSingle()
  return data as EditionDetail | null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const edition = await getEdition(slug)
  if (!edition) return { title: 'Edition not found' }
  return {
    title: `${edition.title} — Product Lab with JT`,
    description: edition.focus_description ?? undefined,
    alternates: { canonical: `/initiatives/product-lab/${edition.slug}` },
  }
}

export default async function ProductLabEditionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const edition = await getEdition(slug)
  if (!edition) notFound()

  const isComingSoon = edition.status === 'coming_soon'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/initiatives" />

      <main style={{ flex: 1, maxWidth: '48rem', margin: '0 auto', width: '100%', padding: '4rem var(--spacing-margin-edge) 6rem' }}>
        <Link href="/initiatives/product-lab" className="text-label-sm" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>← All editions</Link>

        <header style={{ margin: '1.5rem 0 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span className="text-label-sm" style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>Edition {edition.edition_number}</span>
            <span className="badge" style={{ background: edition.status === 'completed' ? '#dcfce7' : 'var(--color-paper-darker)', color: edition.status === 'completed' ? '#15803d' : 'var(--color-ink-deep)' }}>
              {edition.status === 'completed' ? 'Completed' : edition.status === 'open' ? 'Open' : 'Coming Soon'}
            </span>
            {edition.pricing === 'paid' && <span className="badge" style={{ background: 'color-mix(in srgb, var(--color-accent-warm) 20%, transparent)', color: 'oklch(45% 0.12 85)' }}>Paid</span>}
          </div>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.75rem' }}>{edition.title}</h1>
          <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
            {edition.long_description ?? edition.focus_description ?? 'More detail on this edition is coming soon.'}
          </p>
        </header>

        {isComingSoon ? (
          <div style={{ padding: '2rem', background: 'var(--color-paper-darker)', borderRadius: '0.5rem', textAlign: 'center' }}>
            <p className="text-body-md" style={{ color: 'var(--color-ink-deep)', fontWeight: 600, marginBottom: '0.5rem' }}>Details are being finalized</p>
            <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Date, agenda, and speakers will be announced closer to the session.</p>
            <Link href="/contact" className="btn-primary">Register interest →</Link>
          </div>
        ) : (
          <>
            {Object.keys(edition.stats ?? {}).length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem', marginBottom: '2rem', padding: '1.25rem', background: 'var(--color-paper-darker)', borderRadius: '0.5rem' }}>
                {Object.entries(edition.stats).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-headline-sm" style={{ margin: 0, color: 'var(--color-ink-deep)' }}>{value}</p>
                    <p className="text-label-sm" style={{ margin: 0, color: 'var(--color-text-muted)' }}>{label}</p>
                  </div>
                ))}
              </div>
            )}

            {edition.learning_objectives?.length > 0 && (
              <section style={{ marginBottom: '2rem' }}>
                <h2 className="text-headline-sm" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.75rem' }}>Learning Objectives</h2>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
                  {edition.learning_objectives.map((o, i) => <li key={i} className="text-body-md">{o}</li>)}
                </ul>
              </section>
            )}

            {!edition.learning_objectives?.length && !edition.recording_url && !edition.slides_url && (
              <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Full session recap, agenda, and resources are being added for this edition.
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap' }}>
              {edition.recording_url && <a href={edition.recording_url} className="btn-primary">Watch Recording →</a>}
              {edition.slides_url && <a href={edition.slides_url} className="btn-secondary">Slides →</a>}
              {edition.status === 'open' && <Link href="/contact" className="btn-accent">{edition.join_instructions ?? 'Apply to join →'}</Link>}
            </div>
          </>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
