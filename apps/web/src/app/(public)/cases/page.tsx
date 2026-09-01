import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@pshq/api-client/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

export const metadata: Metadata = {
  title: 'Product Case Library — Real Product Teardowns',
  description: 'Real, fully sourced case studies of how African and global product teams actually built, grew, and iterated — including what worked, what did not, and the key lessons.',
  alternates: { canonical: '/cases' },
}

interface CaseSummary {
  id: string
  slug: string
  title: string
  company_name: string
  description: string | null
  logo_url: string | null
  industry: string | null
  country: string | null
  tags: string[]
}

async function getCases(): Promise<CaseSummary[]> {
  const service = createServiceClient()
  const { data } = await service
    .from('case_library_entries')
    .select('id, slug, title, company_name, description, logo_url, industry, country, tags, published_at')
    .eq('status', 'published')
    .not('slug', 'is', null)
    .order('published_at', { ascending: false })

  return (data ?? []) as CaseSummary[]
}

export default async function CasesIndexPage() {
  const cases = await getCases()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/cases" />

      <main style={{ flex: 1, maxWidth: '80rem', margin: '0 auto', width: '100%', padding: '5rem var(--spacing-margin-edge)' }}>
        <section style={{ maxWidth: '48ch', marginBottom: '3rem' }}>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.875rem' }}>Product Case Library</h1>
          <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
            Real product teardowns — how teams across Africa and beyond built, iterated, and scaled. Every case goes past the press release: business model, what worked, what didn&apos;t, and JT&apos;s own read on it.
          </p>
        </section>

        {cases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <p className="text-headline-md" style={{ color: 'var(--color-ink-deep)' }}>New cases are on the way</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
            {cases.map(c => (
              <Link key={c.id} href={`/cases/${c.slug}`} style={{
                display: 'block', textDecoration: 'none',
                border: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)',
                borderRadius: '0.5rem', padding: '1.5rem',
                background: 'var(--color-paper-raised, #fff)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.company_name} width={40} height={40} style={{ borderRadius: '0.25rem', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: '0.25rem', background: 'var(--color-paper-darker)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                      {c.company_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-body-md" style={{ margin: 0, fontWeight: 700, color: 'var(--color-ink-deep)' }}>{c.company_name}</p>
                    {c.country && <p className="text-label-sm" style={{ margin: 0, color: 'var(--color-text-muted)' }}>{c.country}</p>}
                  </div>
                </div>
                <p className="text-body-md" style={{ fontWeight: 600, color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>{c.title}</p>
                {c.description && (
                  <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                    {c.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
