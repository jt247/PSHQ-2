import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@pshq/api-client/server'
import { getMonthlyLearningPathCount } from '@/lib/ai/learning-path'

interface CustomPathRow {
  slug: string
  title: string
  description: string | null
  created_at: string
}

// Epic E §E.1 — "Create My Learning Path," distinct from the curated
// /learning-paths index and from Collections. Lives under My ProductSlice
// since it's a personal, private artifact (status: draft, self-read-own
// RLS only) — filling the "Custom learning paths" slot flagged as missing
// in Epic D's SIDENOTES entry.
export default async function MyLearningPathsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [{ data: paths }, used] = await Promise.all([
    supabase.from('learning_paths').select('slug, title, description, created_at').eq('created_by', user.id).eq('source', 'ai_generated').order('created_at', { ascending: false }),
    getMonthlyLearningPathCount(supabase, user.id),
  ])

  const remaining = Math.max(0, 3 - used)

  return (
    <div className="dash-content" style={{ maxWidth: '640px' }}>
      <section style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.375rem' }}>My Learning Paths</h1>
          <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
            AI-generated paths built from your goals, grounded entirely in real ProductSlice content.
          </p>
        </div>
        <Link href="/dashboard/learning-paths/create" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
          Create My Learning Path
        </Link>
      </section>

      <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
        {remaining} of 3 remaining this month
      </p>

      {(!paths || paths.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'var(--color-paper-darker)', borderRadius: '0.75rem', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)' }}>
          <p className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: '0 0 0.75rem' }}>No custom learning paths yet</p>
          <p className="text-body-md" style={{ color: 'var(--color-text-muted)', margin: '0 0 1.5rem' }}>
            Tell us what you&apos;re trying to achieve and we&apos;ll build a path from real ProductSlice content.
          </p>
          <Link href="/dashboard/learning-paths/create" className="btn-primary">Create My Learning Path</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(paths as CustomPathRow[]).map(p => (
            <Link key={p.slug} href={`/dashboard/learning-paths/${p.slug}`} style={{
              display: 'block', padding: '1.25rem', borderRadius: '0.5rem',
              border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
              textDecoration: 'none',
            }}>
              <p className="text-body-md" style={{ color: 'var(--color-ink-deep)', fontWeight: 600, margin: 0 }}>{p.title}</p>
              {p.description && <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>{p.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
