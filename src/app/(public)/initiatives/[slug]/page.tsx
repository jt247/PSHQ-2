import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import '../initiatives.css'

interface Edition {
  id: string
  edition_number: string
  title: string
  focus_description: string | null
  status: 'completed' | 'open' | 'coming_soon'
  join_method: 'invitation_email' | 'open' | null
  join_instructions: string | null
  stats: Record<string, string | number>
  display_order: number
}

interface InitiativeDetail {
  id: string
  slug: string
  title: string
  short_description: string | null
  hero_description: string | null
  status: 'live' | 'coming_soon' | 'archived'
  editions: Edition[]
}

async function getInitiative(slug: string): Promise<InitiativeDetail | null> {
  const service = createServiceClient()

  const { data, error } = await service
    .from('initiatives')
    .select(`
      id, slug, title, short_description, hero_description, status,
      initiative_editions (
        id, edition_number, title, focus_description, status,
        join_method, join_instructions, stats, display_order
      )
    `)
    .eq('slug', slug)
    .neq('status', 'archived')
    .single()

  if (error || !data) return null

  const editions = ((data.initiative_editions ?? []) as Edition[])
    .slice()
    .sort((a, b) => b.display_order - a.display_order)

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    short_description: data.short_description,
    hero_description: data.hero_description,
    status: data.status as InitiativeDetail['status'],
    editions,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const initiative = await getInitiative(slug)
  if (!initiative) return { title: 'Initiative not found' }
  return {
    title: `${initiative.title} — Product Slice HQ`,
    description: initiative.short_description ?? undefined,
  }
}

function EditionStatusBadge({ status }: { status: Edition['status'] }) {
  const config = {
    open:      { label: 'Open',      className: 'live' },
    coming_soon: { label: 'Coming Soon', className: 'coming-soon' },
    completed: { label: 'Completed', className: 'coming-soon' },
  }[status]

  return (
    <span className={`initiative-status-badge ${config.className}`}>
      {config.label}
    </span>
  )
}

function JoinBlock({ edition }: { edition: Edition }) {
  if (edition.status === 'completed') return null

  const joinLabel = edition.join_method === 'invitation_email'
    ? 'Invitation only — check your email or reach out to apply.'
    : edition.join_instructions ?? 'Open applications — reach out to join.'

  return (
    <div className="sidebar-block">
      <h3>How to Join</h3>
      <p>{joinLabel}</p>
      <Link href="/contact" className="btn-primary" style={{ marginTop: '0.25rem', alignSelf: 'flex-start', display: 'inline-block' }}>
        Get in touch →
      </Link>
    </div>
  )
}

function StatsRow({ stats }: { stats: Record<string, string | number> }) {
  const entries = Object.entries(stats)
  if (entries.length === 0) return null

  return (
    <div className="edition-stats">
      {entries.map(([label, value]) => (
        <div key={label} className="edition-stat">
          <span className="edition-stat-value">{value}</span>
          <span className="edition-stat-label">{label}</span>
        </div>
      ))}
    </div>
  )
}

export default async function InitiativeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const initiative = await getInitiative(slug)

  if (!initiative) notFound()

  const latestEdition = initiative.editions[0] ?? null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/initiatives" />

      <main style={{ flex: 1 }}>
        {/* Dark hero */}
        <header className="initiative-detail-hero">
          <div className="initiative-detail-hero-inner">
            <Link href="/initiatives" className="initiative-detail-back">
              ← All initiatives
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <span className={`initiative-status-badge ${initiative.status === 'live' ? 'live' : 'coming-soon'}`}
                style={{ background: initiative.status === 'live' ? 'rgba(22,163,74,0.18)' : 'rgba(255,255,255,0.1)', color: initiative.status === 'live' ? '#4ade80' : 'rgba(255,255,255,0.55)' }}>
                {initiative.status === 'live' ? 'Live' : 'Coming Soon'}
              </span>
              {latestEdition && (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.08em' }}>
                  {latestEdition.edition_number} · {latestEdition.title}
                </span>
              )}
            </div>

            <h1>{initiative.title}</h1>

            {(initiative.hero_description ?? initiative.short_description) && (
              <p className="initiative-detail-lead">
                {initiative.hero_description ?? initiative.short_description}
              </p>
            )}
          </div>
        </header>

        {/* Body: editions + sidebar */}
        <div className="initiative-detail-body">
          {/* Left: editions */}
          <section className="initiative-detail-editions">
            <h2>Editions</h2>

            {initiative.editions.length === 0 ? (
              <div className="initiative-placeholder-note">
                <p>No editions have been published yet. Check back soon — the first edition is in progress.</p>
              </div>
            ) : (
              initiative.editions.map((ed) => (
                <article key={ed.id} className="edition-card">
                  <div className="edition-card-header">
                    <span className="edition-number">{ed.edition_number}</span>
                    <EditionStatusBadge status={ed.status} />
                  </div>

                  <h3 className="edition-title">{ed.title}</h3>

                  {ed.focus_description && (
                    <p className="edition-focus">{ed.focus_description}</p>
                  )}

                  <StatsRow stats={ed.stats} />

                  {ed.status !== 'completed' && ed.join_instructions && (
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0', lineHeight: 1.65 }}>
                      {ed.join_instructions}
                    </p>
                  )}
                </article>
              ))
            )}
          </section>

          {/* Right: sidebar */}
          <aside className="initiative-detail-sidebar">
            {latestEdition && latestEdition.status !== 'completed' && (
              <JoinBlock edition={latestEdition} />
            )}

            <div className="sidebar-block">
              <h3>About this initiative</h3>
              <p>{initiative.short_description ?? 'A Product Slice HQ programme.'}</p>
            </div>

            <div className="sidebar-block">
              <h3>All Initiatives</h3>
              <Link
                href="/initiatives"
                style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-ink-deep)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                ← Back to all programmes
              </Link>
            </div>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
