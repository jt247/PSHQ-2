import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@pshq/api-client/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

export const metadata: Metadata = {
  title: 'Product Lab with JT — Hands-On AI Product Cohorts',
  description: 'A hands-on cohort for product practitioners building real intuition with AI tools — live sessions, peer critique, and direct access to JT. Past, upcoming, and coming-soon editions.',
  alternates: { canonical: '/initiatives/product-lab' },
}

interface Edition {
  slug: string | null
  edition_number: string
  title: string
  focus_description: string | null
  status: 'completed' | 'open' | 'coming_soon'
  pricing: string
  stats: Record<string, string | number>
  display_order: number
}

async function getEditions(): Promise<{ heroDescription: string | null; editions: Edition[] }> {
  const service = createServiceClient()
  const { data } = await service
    .from('initiatives')
    .select('hero_description, initiative_editions (slug, edition_number, title, focus_description, status, pricing, stats, display_order)')
    .eq('slug', 'product-lab')
    .maybeSingle()

  if (!data) return { heroDescription: null, editions: [] }
  const editions = ((data.initiative_editions ?? []) as Edition[]).slice().sort((a, b) => a.display_order - b.display_order)
  return { heroDescription: data.hero_description as string | null, editions }
}

const STATUS_LABEL: Record<Edition['status'], string> = { completed: 'Completed', open: 'Open', coming_soon: 'Coming Soon' }

export default async function ProductLabOverviewPage() {
  const { heroDescription, editions } = await getEditions()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/initiatives" />

      <main style={{ flex: 1, maxWidth: '64rem', margin: '0 auto', width: '100%', padding: '5rem var(--spacing-margin-edge)' }}>
        <p className="text-label-sm" style={{ color: 'var(--color-accent-warm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Initiative</p>
        <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '1rem' }}>Product Lab with JT</h1>
        <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', maxWidth: '56ch', marginBottom: '3rem' }}>
          {heroDescription ?? 'A hands-on cohort for product practitioners who want to build real intuition — through live sessions, peer critique, and direct access to JT.'}
        </p>

        <h2 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', marginBottom: '1.5rem' }}>Editions</h2>

        {editions.length === 0 ? (
          <p className="text-body-md" style={{ color: 'var(--color-text-muted)' }}>Editions are being finalized — check back soon.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {editions.map(ed => (
              <Link
                key={ed.edition_number}
                href={ed.slug ? `/initiatives/product-lab/${ed.slug}` : '/initiatives/product-lab'}
                style={{
                  display: 'block', textDecoration: 'none', padding: '1.5rem',
                  border: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)',
                  borderRadius: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
                  <span className="text-label-sm" style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>Edition {ed.edition_number}</span>
                  <span className="badge" style={{ background: ed.status === 'completed' ? '#dcfce7' : ed.status === 'open' ? 'color-mix(in srgb, var(--color-accent-warm) 20%, transparent)' : 'var(--color-paper-darker)', color: ed.status === 'completed' ? '#15803d' : 'var(--color-ink-deep)' }}>
                    {STATUS_LABEL[ed.status]}
                  </span>
                  {ed.pricing === 'paid' && <span className="badge" style={{ background: 'color-mix(in srgb, var(--color-accent-warm) 20%, transparent)', color: 'oklch(45% 0.12 85)' }}>Paid</span>}
                </div>
                <p className="text-body-lg" style={{ fontWeight: 600, color: 'var(--color-ink-deep)', marginBottom: '0.375rem' }}>{ed.title}</p>
                {ed.focus_description && <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>{ed.focus_description}</p>}
              </Link>
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
