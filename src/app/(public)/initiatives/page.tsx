import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import './initiatives.css'

interface LatestEdition {
  status: 'completed' | 'open' | 'coming_soon'
  edition_number: string
  title: string
}

interface Initiative {
  id: string
  slug: string
  title: string
  short_description: string | null
  status: 'live' | 'coming_soon' | 'archived'
  display_order: number
  latest_edition: LatestEdition | null
}

async function getInitiatives(): Promise<Initiative[]> {
  const service = createServiceClient()

  const { data: rows, error } = await service
    .from('initiatives')
    .select(`
      id, slug, title, short_description, status, display_order,
      initiative_editions (
        edition_number, title, status, display_order
      )
    `)
    .neq('status', 'archived')
    .order('display_order', { ascending: true })

  if (error || !rows) return []

  return rows.map((row) => {
    const editions = (row.initiative_editions ?? []) as LatestEdition[]
    const sorted = [...editions].sort((a, b) => {
      const aOrder = (a as unknown as { display_order: number }).display_order
      const bOrder = (b as unknown as { display_order: number }).display_order
      return bOrder - aOrder
    })
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      short_description: row.short_description,
      status: row.status as Initiative['status'],
      display_order: row.display_order,
      latest_edition: sorted[0] ?? null,
    }
  })
}

function editionBadgeLabel(edition: LatestEdition): string {
  const map: Record<LatestEdition['status'], string> = {
    open: 'Open',
    coming_soon: 'Coming Soon',
    completed: 'Edition Completed',
  }
  return `${edition.edition_number} · ${map[edition.status]}`
}

function StatusBadge({ status }: { status: Initiative['status'] }) {
  const label = status === 'live' ? 'Live' : 'Coming Soon'
  return (
    <span className={`initiative-status-badge ${status === 'live' ? 'live' : 'coming-soon'}`}>
      {label}
    </span>
  )
}

export default async function InitiativesPage() {
  const initiatives = await getInitiatives()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/initiatives" />

      <main style={{ flex: 1 }}>
        {/* Hero */}
        <section className="initiatives-hero">
          <p className="initiatives-hero-eyebrow">Our Work</p>
          <h1>Initiatives &amp; Programmes</h1>
          <p className="initiatives-hero-lead">
            Beyond content — structured programmes that build the professional infrastructure
            product practitioners in Africa need to grow, collaborate, and ship real work.
          </p>
        </section>

        {/* Initiative rows */}
        <section className="initiatives-stack" aria-label="Initiatives">
          {initiatives.map((item, idx) => (
            <Link
              key={item.id}
              href={`/initiatives/${item.slug}`}
              className="initiative-row"
              aria-label={`View ${item.title}`}
            >
              <div className="initiative-row-meta">
                <span className="initiative-number" aria-hidden="true">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <StatusBadge status={item.status} />
              </div>

              <div className="initiative-row-content">
                {item.latest_edition && (
                  <span className="initiative-edition-pill">
                    {editionBadgeLabel(item.latest_edition)}
                  </span>
                )}
                <h2 className="initiative-title">{item.title}</h2>
                {item.short_description && (
                  <p className="initiative-description">{item.short_description}</p>
                )}
                <span className="initiative-cta">
                  Explore initiative <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          ))}

          {initiatives.length === 0 && (
            <p style={{ padding: '3rem 0', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
              No initiatives found.
            </p>
          )}
        </section>

        {/* CTA band */}
        <div className="initiatives-cta-band">
          <div className="initiatives-cta-band-inner">
            <div>
              <h2>Want to collaborate or contribute?</h2>
              <p>We&apos;re always looking for mentors, collaborators, and practitioners to shape what we build.</p>
            </div>
            <Link href="/contact" className="btn-accent" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              Reach out →
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
