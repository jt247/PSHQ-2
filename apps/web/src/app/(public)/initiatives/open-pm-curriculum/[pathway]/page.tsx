import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@pshq/api-client/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

interface Lesson { title: string; summary: string; display_order: number }
interface Module { module_number: number; title: string; description: string | null; curriculum_lessons: Lesson[] }
interface PathwayDetail {
  slug: string
  title: string
  description: string | null
  status: 'live' | 'coming_soon'
  curriculum_modules: Module[]
}

async function getPathway(slug: string): Promise<PathwayDetail | null> {
  const service = createServiceClient()
  const { data } = await service
    .from('curriculum_pathways')
    .select('slug, title, description, status, curriculum_modules (module_number, title, description, display_order, curriculum_lessons (title, summary, display_order))')
    .eq('slug', slug)
    .maybeSingle()
  if (!data) return null
  const modules = ((data.curriculum_modules ?? []) as Module[]).slice().sort((a, b) => a.module_number - b.module_number)
    .map(m => ({ ...m, curriculum_lessons: [...m.curriculum_lessons].sort((a, b) => a.display_order - b.display_order) }))
  return { ...(data as Omit<PathwayDetail, 'curriculum_modules'>), curriculum_modules: modules }
}

export async function generateMetadata({ params }: { params: Promise<{ pathway: string }> }): Promise<Metadata> {
  const { pathway } = await params
  const item = await getPathway(pathway)
  if (!item) return { title: 'Pathway not found' }
  return { title: `${item.title} — Open PM Curriculum`, alternates: { canonical: `/initiatives/open-pm-curriculum/${item.slug}` } }
}

export default async function CurriculumPathwayPage({ params }: { params: Promise<{ pathway: string }> }) {
  const { pathway } = await params
  const item = await getPathway(pathway)
  if (!item) notFound()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/initiatives" />

      <main style={{ flex: 1, maxWidth: '48rem', margin: '0 auto', width: '100%', padding: '4rem var(--spacing-margin-edge) 6rem' }}>
        <Link href="/initiatives/open-pm-curriculum" className="text-label-sm" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>← All pathways</Link>

        <header style={{ margin: '1.5rem 0 2.5rem' }}>
          {item.status === 'live' && (
            <p className="text-label-sm" style={{ color: 'var(--color-accent-warm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Interim curriculum — JT is expanding and refining this over time
            </p>
          )}
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.75rem' }}>{item.title}</h1>
          <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>{item.description}</p>
        </header>

        {item.status !== 'live' || item.curriculum_modules.length === 0 ? (
          <div style={{ padding: '2rem', background: 'var(--color-paper-darker)', borderRadius: '0.5rem', textAlign: 'center' }}>
            <p className="text-body-md" style={{ color: 'var(--color-ink-deep)', fontWeight: 600, marginBottom: '0.5rem' }}>JT is writing this pathway now</p>
            <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>Real modules and lessons for {item.title} are being added directly. Check back soon.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {item.curriculum_modules.map(m => (
              <section key={m.module_number}>
                <h2 className="text-headline-sm" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.375rem' }}>
                  Module {m.module_number}: {m.title}
                </h2>
                {m.description && <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>{m.description}</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {m.curriculum_lessons.map((l, i) => (
                    <div key={i} style={{ padding: '1rem 1.25rem', borderLeft: '2px solid color-mix(in srgb, var(--color-tertiary) 20%, transparent)' }}>
                      <p className="text-body-md" style={{ fontWeight: 600, color: 'var(--color-ink-deep)', marginBottom: '0.375rem' }}>{l.title}</p>
                      <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{l.summary}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
