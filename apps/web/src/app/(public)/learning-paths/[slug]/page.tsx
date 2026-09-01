import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { ModuleRow } from './ModuleRow'
import { StartPathButton } from './StartPathButton'

interface ModuleContent { slug: string; type: string }
interface ModuleRowData { id: string; content_id: string | null; title: string; description: string | null; is_required: boolean; sequence: number; content: ModuleContent | null }
interface PathDetail {
  id: string
  slug: string
  title: string
  description: string | null
  target_audience: string | null
  level: string | null
  estimated_time_minutes: number | null
  outcomes: string[]
  prerequisites: string[]
  learning_path_modules: ModuleRowData[]
}

function moduleHref(content: ModuleContent | null): string | null {
  if (!content) return null
  return content.type === 'article' ? `/articles/${content.slug}` : content.type === 'build_note' ? `/build-notes/${content.slug}` : `/content/${content.slug}`
}

async function getPath(slug: string): Promise<PathDetail | null> {
  const service = createServiceClient()
  const { data } = await service
    .from('learning_paths')
    .select(`
      id, slug, title, description, target_audience, level, estimated_time_minutes, outcomes, prerequisites,
      learning_path_modules (id, content_id, title, description, is_required, sequence, content:content_id (slug, type))
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!data) return null
  const modules = ((data.learning_path_modules ?? []) as unknown as ModuleRowData[]).slice().sort((a, b) => a.sequence - b.sequence)
  return { ...(data as Omit<PathDetail, 'learning_path_modules'>), learning_path_modules: modules }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const item = await getPath(slug)
  if (!item) return { title: 'Learning path not found' }
  return { title: `${item.title} — Learning Paths`, description: item.description ?? undefined, alternates: { canonical: `/learning-paths/${item.slug}` } }
}

export default async function LearningPathDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const path = await getPath(slug)
  if (!path) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let completedModuleIds = new Set<string>()
  let hasStarted = false
  if (user) {
    const [{ data: progress }, { data: userPath }] = await Promise.all([
      supabase.from('module_progress').select('module_id').eq('user_id', user.id).eq('status', 'completed'),
      supabase.from('user_learning_paths').select('id').eq('user_id', user.id).eq('learning_path_id', path.id).maybeSingle(),
    ])
    completedModuleIds = new Set((progress ?? []).map(p => p.module_id))
    hasStarted = !!userPath
  }

  const requiredModules = path.learning_path_modules.filter(m => m.is_required)
  const completedRequired = requiredModules.filter(m => completedModuleIds.has(m.id)).length
  const progressPct = requiredModules.length > 0 ? Math.round((completedRequired / requiredModules.length) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/learning-paths" />

      <main style={{ flex: 1, maxWidth: '48rem', margin: '0 auto', width: '100%', padding: '4rem var(--spacing-margin-edge) 6rem' }}>
        <Link href="/learning-paths" className="text-label-sm" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>← All paths</Link>

        <header style={{ margin: '1.5rem 0 2rem' }}>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.75rem' }}>{path.title}</h1>
          {path.description && <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>{path.description}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {path.level && <span className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-ink-deep)', textTransform: 'capitalize' }}>{path.level}</span>}
            {path.estimated_time_minutes && <span className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-ink-deep)' }}>{path.estimated_time_minutes} min</span>}
            {path.target_audience && <span className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-ink-deep)' }}>{path.target_audience}</span>}
          </div>

          {user ? (
            hasStarted ? (
              <div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--color-paper-darker)', overflow: 'hidden', marginBottom: '0.5rem', maxWidth: '20rem' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: '#15803d', borderRadius: 4 }} />
                </div>
                <p className="text-label-sm" style={{ color: 'var(--color-text-muted)' }}>{progressPct}% complete · {completedRequired}/{requiredModules.length} required modules</p>
              </div>
            ) : (
              <StartPathButton pathId={path.id} pathSlug={path.slug} />
            )
          ) : (
            <Link href="/sign-in?redirect=/learning-paths" className="btn-accent">Sign in to track progress →</Link>
          )}
        </header>

        {path.outcomes?.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 className="text-headline-sm" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.75rem' }}>Outcomes</h2>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
              {path.outcomes.map((o, i) => <li key={i} className="text-body-md">{o}</li>)}
            </ul>
          </section>
        )}

        <h2 className="text-headline-sm" style={{ color: 'var(--color-ink-deep)', marginBottom: '1rem' }}>Modules</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {path.learning_path_modules.map(m => (
            <ModuleRow
              key={m.id}
              moduleId={m.id}
              pathId={path.id}
              pathSlug={path.slug}
              title={m.title}
              description={m.description}
              href={moduleHref(m.content)}
              isCompleted={completedModuleIds.has(m.id)}
              canTrack={!!user && hasStarted}
              sequence={m.sequence}
            />
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
