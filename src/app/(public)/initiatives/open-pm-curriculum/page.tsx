import Link from 'next/link'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { CurriculumGrid } from '@/components/curriculum/CurriculumGrid'
import './curriculum.css'

export const metadata: Metadata = {
  title: 'Open PM Curriculum — Product Slice HQ',
  description:
    'Six structured learning paths for product practitioners — General PM, AI PM, Growth PM, Technical PM, Strategic PM, and The PM Architect. A guide, not a course.',
}

interface Pathway {
  id: string
  slug: string
  title: string
  description: string | null
  status: 'live' | 'coming_soon'
  display_order: number
}

async function getPathways(): Promise<Pathway[]> {
  const service = createServiceClient()

  const { data, error } = await service
    .from('curriculum_pathways')
    .select('id, slug, title, description, status, display_order')
    .order('display_order', { ascending: true })

  if (error || !data) return []
  return data as Pathway[]
}

const STAGES = [
  { num: '01', label: 'Overview', sub: 'What this path is and who it\'s for' },
  { num: '02', label: 'Foundation', sub: 'Core concepts and mental models' },
  { num: '03', label: 'Craft', sub: 'Tools, frameworks, real practice' },
  { num: '04', label: 'Portfolio', sub: 'Build something you can show' },
  { num: '05', label: 'Next Steps', sub: 'Where to go from here' },
]

export default async function OpenPMCurriculumPage() {
  const pathways = await getPathways()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/initiatives" />

      <main style={{ flex: 1 }}>

        {/* ── Hero ── */}
        <header className="opc-hero">
          <div className="opc-hero-inner">
            <div>
              <Link href="/initiatives" className="opc-hero-back">
                ← All initiatives
              </Link>
              <p className="opc-hero-eyebrow">Open PM Curriculum</p>
              <h1>Six Ways to Learn Product Management in 2026</h1>
            </div>

            <div className="opc-hero-right">
              <span className="opc-hero-status">
                <span style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} aria-hidden="true" />
                Curriculum Coming Soon
              </span>

              <p className="opc-hero-subhead">
                This is a guide, not a course. We won&apos;t teach you here — we&apos;ll
                tell you exactly what to focus on and where to look. Pick your
                path, then go find the courses, channels, and resources that fit
                where you are. We point, you do the work.
              </p>

              <div className="opc-hero-meta" aria-label="Curriculum overview">
                <div className="opc-hero-meta-item">
                  <span className="opc-hero-meta-value">6</span>
                  <span className="opc-hero-meta-label">Pathways</span>
                </div>
                <div className="opc-hero-meta-divider" aria-hidden="true" />
                <div className="opc-hero-meta-item">
                  <span className="opc-hero-meta-value">5</span>
                  <span className="opc-hero-meta-label">Stages each</span>
                </div>
                <div className="opc-hero-meta-divider" aria-hidden="true" />
                <div className="opc-hero-meta-item">
                  <span className="opc-hero-meta-value">Free</span>
                  <span className="opc-hero-meta-label">Always</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Pathway grid ── */}
        <section className="opc-paths" aria-labelledby="paths-heading">
          <div className="opc-paths-inner">
            <div className="opc-paths-header">
              <h2 id="paths-heading">Choose your path</h2>
              <p>Click any pathway to see its status. All six are in progress — launching together.</p>
            </div>

            <CurriculumGrid pathways={pathways} />
          </div>
        </section>

        {/* ── Curriculum structure teaser ── */}
        <section className="opc-structure" aria-labelledby="structure-heading">
          <div className="opc-structure-inner">
            <div className="opc-structure-left">
              <h2 id="structure-heading">Every pathway follows the same five stages</h2>
              <p>
                We designed the structure so you always know where you are and
                what comes next — regardless of which path you pick.
              </p>
            </div>

            <div className="opc-stages" role="list" aria-label="Curriculum stages">
              {STAGES.map((stage, idx) => (
                <div key={stage.num} className="opc-stage" role="listitem">
                  <span className="opc-stage-num">{stage.num}</span>
                  <span className="opc-stage-label">{stage.label}</span>
                  <p className="opc-stage-sub">{stage.sub}</p>
                  {idx < STAGES.length - 1 && (
                    <span className="opc-stage-arrow" aria-hidden="true">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="opc-cta">
          <div className="opc-cta-inner">
            <div>
              <h2>Want to know when this launches?</h2>
              <p>
                Send us an email and we&apos;ll notify you when the curriculum
                goes live. No newsletter, no drip — just one email when it&apos;s ready.
              </p>
            </div>

            <div className="opc-cta-actions">
              <a
                href="mailto:hello@productslicehq.com?subject=Open PM Curriculum — Notify Me"
                className="opc-notify-link"
                aria-label="Email to be notified when the curriculum launches"
              >
                hello@productslicehq.com →
              </a>
              <span className="opc-notify-sub">One email. No spam.</span>
            </div>
          </div>
        </div>

      </main>

      <PublicFooter />
    </div>
  )
}
