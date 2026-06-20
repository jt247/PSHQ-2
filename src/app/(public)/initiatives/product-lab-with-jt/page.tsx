import Link from 'next/link'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import './product-lab.css'

export const metadata: Metadata = {
  title: 'Product Lab with JT — Product Slice HQ',
  description:
    'A hands-on cohort for product managers, product leaders, aspiring founders, and existing startup founders who want to go from idea to a live, working product, fast, using AI-assisted tools.',
}

interface Edition {
  id: string
  edition_number: string
  title: string
  focus_description: string | null
  status: 'completed' | 'open' | 'coming_soon'
  join_method: 'invitation_email' | 'open' | null
  join_instructions: string | null
  stats: Record<string, number | string>
  display_order: number
}

async function getEditions(): Promise<Edition[]> {
  const service = createServiceClient()

  const { data, error } = await service
    .from('initiative_editions')
    .select(`
      id, edition_number, title, focus_description, status,
      join_method, join_instructions, stats, display_order,
      initiatives!inner(slug)
    `)
    .eq('initiatives.slug', 'product-lab-with-jt')
    .order('display_order', { ascending: true })

  if (error || !data) return []
  return data as unknown as Edition[]
}

const PHASES = [
  { num: '01', label: 'Mental Model', sub: 'How to think about building with AI' },
  { num: '02', label: 'OCP Framework', sub: 'Output, Context, Prompt — the foundation' },
  { num: '03', label: 'Infrastructure', sub: 'Setting up your stack for speed' },
]

const LABS = [
  { num: 'Lab 1', name: 'Lovable', tools: 'Rapid UI + full-stack generation' },
  { num: 'Lab 2', name: 'Google AI Studio + Stitch + Firebase', tools: 'AI orchestration + real-time backend' },
  { num: 'Lab 3', name: 'Claude Code + Adalo', tools: 'Code-native AI + mobile deployment' },
]

export default async function ProductLabPage() {
  const editions = await getEditions()

  const edition1 = editions.find(e => e.edition_number === '1.0')
  const edition2 = editions.find(e => e.edition_number === '2.0')
  const edition3 = editions.find(e => e.edition_number === '3.0')

  const stats1 = edition1?.stats ?? {}

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/initiatives" />

      <main style={{ flex: 1 }}>

        {/* ── Hero ── */}
        <header className="pl-hero">
          <div className="pl-hero-inner">
            <Link href="/initiatives" className="pl-hero-back">
              ← All initiatives
            </Link>

            <span className="pl-hero-tag">
              Cohort Programme
            </span>

            <h1>
              AI-Assisted Product Development,{' '}
              For People Who&apos;d Rather Build Than Wait
            </h1>

            <p className="pl-hero-subhead">
              A hands-on cohort for product managers, product leaders, aspiring founders,
              and existing startup founders who want to go from idea to a live, working
              product — fast, using AI-assisted tools.
            </p>
          </div>
        </header>

        {/* ── Edition 2.0 — Open Now ── */}
        <section className="pl-active-edition" aria-labelledby="edition-2-heading">
          <div className="pl-active-edition-inner">

            <div>
              <p className="pl-edition-label">
                <span className="dot" aria-hidden="true" />
                Edition 2.0 — Open Now
              </p>

              <h2 id="edition-2-heading">
                {edition2?.title ?? 'Advanced Lovable + Google AI Suite'}
              </h2>

              <p className="pl-active-edition-focus">
                {edition2?.focus_description ??
                  'Advanced Lovable development and the Google AI suite — Antigravity, Stitch, and Google AI Studio.'}
              </p>

              <div className="pl-active-tools" aria-label="Tools covered">
                {['Lovable', 'Google Antigravity', 'Google Stitch', 'Google AI Studio'].map(tool => (
                  <span key={tool} className="pl-tool-chip">{tool}</span>
                ))}
              </div>
            </div>

            {/* Join card */}
            <aside className="pl-join-card" aria-label="How to join Edition 2.0">
              <span className="pl-join-card-badge">
                <span style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: 'var(--color-accent-warm)', display: 'inline-block' }} aria-hidden="true" />
                Invitation Only
              </span>

              <h3>Ready to join Edition 2.0?</h3>

              <p>
                Spots are limited. Send an email to apply and we&apos;ll get back to you
                with next steps and cohort details.
              </p>

              <div className="pl-join-email-cta">
                <span className="label">Apply by email</span>
                <a
                  href="mailto:hello@productslicehq.com?subject=Product Lab 2.0 — Application"
                  className="pl-join-email-link"
                  aria-label="Email hello@productslicehq.com to apply for Edition 2.0"
                >
                  hello@productslicehq.com
                  <span className="arrow" aria-hidden="true">→</span>
                </a>
              </div>
            </aside>

          </div>
        </section>

        {/* ── Edition 1.0 — Recap ── */}
        <section className="pl-recap-edition" aria-labelledby="edition-1-heading">
          <div className="pl-recap-inner">

            <div className="pl-recap-header">
              <h2 id="edition-1-heading">Edition 1.0 — The One-Day Build Sprint</h2>
              <span className="pl-recap-tag">Completed</span>
            </div>

            {/* Stats */}
            <div className="pl-stats-row" role="list" aria-label="Edition 1.0 results">
              {(Object.entries(stats1).length > 0
                ? Object.entries(stats1)
                : [
                    ['Registered', 143],
                    ['Attended', 118],
                    ['Products Shipped', 26],
                    ['Internships Landed', 4],
                    ['Paid Freelance Builds', 2],
                  ]
              ).map(([label, value]) => (
                <div key={label} className="pl-stat-card" role="listitem">
                  <span className="pl-stat-value">{value}</span>
                  <span className="pl-stat-label">{label}</span>
                </div>
              ))}
            </div>

            <div className="pl-recap-content">
              {/* Description + labs */}
              <div>
                <p className="pl-recap-description">
                  {edition1?.focus_description ??
                    'Three tools, three labs, one day. Participants built real, live products using Lovable, Google AI Studio + Stitch + Firebase, and Claude Code + Adalo.'}
                </p>

                {/* Build Labs */}
                <div className="pl-labs-row" aria-label="Build labs from Edition 1.0">
                  {LABS.map(lab => (
                    <div key={lab.num} className="pl-lab-card">
                      <span className="pl-lab-num">{lab.num}</span>
                      <span className="pl-lab-name">{lab.name}</span>
                      <span className="pl-lab-tools">{lab.tools}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* What we covered */}
              <div>
                <div className="pl-phases">
                  <h3>What we covered</h3>
                  {PHASES.map(p => (
                    <div key={p.num} className="pl-phase-item">
                      <span className="pl-phase-num">{p.num}</span>
                      <div>
                        <p className="pl-phase-text">{p.label}</p>
                        <p className="pl-phase-sub">{p.sub}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pl-phase-item" style={{ borderBottom: 'none' }}>
                    <span className="pl-phase-num">→</span>
                    <div>
                      <p className="pl-phase-text">Three Build Labs</p>
                      <p className="pl-phase-sub">Live, hands-on product builds using the tools above</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── Edition 3.0 — Coming Soon ── */}
        <section className="pl-teaser-edition" aria-labelledby="edition-3-heading">
          <div className="pl-teaser-inner">

            <div className="pl-teaser-left">
              <p className="pl-teaser-eyebrow">Up Next</p>
              <h2 id="edition-3-heading">
                Edition 3.0 —{' '}
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>Coming Soon</span>
              </h2>
              <p>
                {edition3?.focus_description ??
                  'Built for non-technical builders ready to go technical. This edition focuses on Claude Code, taught from zero.'}
              </p>
            </div>

            <div className="pl-teaser-right">
              <div className="pl-notify-cta">
                <span className="pl-notify-label">Want early access?</span>
                <a
                  href="mailto:hello@productslicehq.com?subject=Product Lab 3.0 — Notify Me"
                  className="pl-join-email-link"
                  style={{ fontSize: '0.9375rem' }}
                  aria-label="Email to be notified about Edition 3.0"
                >
                  hello@productslicehq.com
                  <span className="arrow" aria-hidden="true">→</span>
                </a>
              </div>
            </div>

          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  )
}
