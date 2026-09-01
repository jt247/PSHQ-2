import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@pshq/api-client/server'
import { ModuleRow } from '@/components/learning-paths/ModuleRow'

interface ModuleContent { slug: string; type: string }
interface ModuleRowData { id: string; content_id: string | null; title: string; description: string | null; is_required: boolean; sequence: number; content: ModuleContent | null }
interface PathDetail {
  id: string
  slug: string
  title: string
  goal_summary: string | null
  milestones: string[]
  completion_criteria: string | null
  weekly_time_commitment_minutes: number | null
  target_timeline_weeks: number | null
  learning_path_modules: ModuleRowData[]
}

function moduleHref(content: ModuleContent | null): string | null {
  if (!content) return null
  return content.type === 'article' ? `/articles/${content.slug}` : content.type === 'build_note' ? `/build-notes/${content.slug}` : `/content/${content.slug}`
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return { title: `${slug} — My Learning Path` }
}

// Custom (AI-generated) path view — separate from the curated /learning-
// paths/[slug] page since a custom path is status='draft' and self-read-
// own only (never public), whereas that page deliberately requires
// status='published' via the service client. Same ModuleRow component,
// same toggleModuleCompleteAction, same progress mechanics either way —
// per the prompt's own instruction to reuse the existing pattern.
export default async function CustomLearningPathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data } = await supabase
    .from('learning_paths')
    .select(`
      id, slug, title, goal_summary, milestones, completion_criteria, weekly_time_commitment_minutes, target_timeline_weeks,
      learning_path_modules (id, content_id, title, description, is_required, sequence, content:content_id (slug, type))
    `)
    .eq('slug', slug)
    .eq('created_by', user.id)
    .eq('source', 'ai_generated')
    .maybeSingle()

  if (!data) notFound()

  const path = data as unknown as PathDetail
  const modules = (path.learning_path_modules ?? []).slice().sort((a, b) => a.sequence - b.sequence)

  const { data: progressRows } = await supabase
    .from('module_progress')
    .select('module_id, status')
    .eq('user_id', user.id)
    .in('module_id', modules.map(m => m.id))

  const completedSet = new Set((progressRows ?? []).filter(p => p.status === 'completed').map(p => p.module_id))

  return (
    <div className="dash-content" style={{ maxWidth: '640px' }}>
      <Link href="/dashboard/learning-paths" className="text-label-sm" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>← My Learning Paths</Link>

      <header style={{ margin: '1.5rem 0 2rem' }}>
        <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>{path.title}</h1>
        {path.goal_summary && <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>{path.goal_summary}</p>}
        <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          {completedSet.size} of {modules.length} modules complete
          {path.target_timeline_weeks ? ` · ${path.target_timeline_weeks} week target` : ''}
        </p>
      </header>

      {path.milestones?.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 className="text-label-sm" style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>Milestones</h2>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
            {path.milestones.map((m, i) => <li key={i} className="text-body-md">{m}</li>)}
          </ul>
        </section>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {modules.map(m => (
          <ModuleRow
            key={m.id}
            moduleId={m.id}
            pathId={path.id}
            pathSlug={path.slug}
            title={m.title}
            description={m.description}
            href={moduleHref(m.content)}
            isCompleted={completedSet.has(m.id)}
            canTrack
            sequence={m.sequence + 1}
          />
        ))}
      </section>

      {path.completion_criteria && (
        <section style={{ padding: '1.25rem', background: 'var(--color-paper-darker)', borderRadius: '0.5rem' }}>
          <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.375rem' }}>Done looks like</p>
          <p className="text-body-md" style={{ color: 'var(--color-ink-deep)', margin: 0 }}>{path.completion_criteria}</p>
        </section>
      )}
    </div>
  )
}
