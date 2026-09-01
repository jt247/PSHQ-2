import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@pshq/api-client/server'
import { getStarterRecommendations } from '@pshq/api-client/recommendations'
import { rerankRecommendations } from '@/lib/ai/rerank'
import { trackAiRecommendationShown } from '@pshq/analytics'
import type { UserRow } from '@pshq/database'

const TYPE_HREF: Record<string, (slug: string) => string> = {
  article: slug => `/articles/${slug}`,
  ebook: slug => `/content/${slug}`,
  template: slug => `/content/${slug}`,
  course: slug => `/content/${slug}`,
}

export default async function OnboardingCompletePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profileRaw } = await supabase.from('users').select('onboarding_done, first_name').eq('id', user.id).single()
  const profile = profileRaw as Pick<UserRow, 'onboarding_done' | 'first_name'> | null
  if (!profile?.onboarding_done) redirect('/onboarding')

  const recs = await getStarterRecommendations(supabase, user.id)

  // Layer 2 (E.6) — re-rank the one real list in this stub's output (the
  // 3 recommended articles). primaryPath/template/collection are single
  // picks, not lists, so there's nothing to re-rank there.
  if (recs.articles.length > 1) {
    const [{ data: userRow }, { data: userTopics }, { data: userGoals }] = await Promise.all([
      supabase.from('users').select('experience_level, roles:primary_role_id(name)').eq('id', user.id).maybeSingle(),
      supabase.from('user_topics').select('topic:topics(name)').eq('user_id', user.id),
      supabase.from('user_goals').select('goal:goals(name)').eq('user_id', user.id),
    ])
    const roleName = (userRow as unknown as { roles: { name: string } | null } | null)?.roles?.name ?? null
    const level = (userRow as { experience_level: string | null } | null)?.experience_level ?? null
    const topicNames = ((userTopics ?? []) as unknown as Array<{ topic: { name: string } | null }>).map(t => t.topic?.name).filter((n): n is string => !!n)
    const goalNames = ((userGoals ?? []) as unknown as Array<{ goal: { name: string } | null }>).map(g => g.goal?.name).filter((n): n is string => !!n)

    const ranked = await rerankRecommendations(
      supabase, user.id, 'onboarding_starting_point',
      recs.articles.map(a => ({ id: a.id, title: a.title, slug: a.slug, type: a.type, excerpt: a.summary ?? '' })),
      { roleName, level, topicNames, goalNames }
    )
    recs.articles = ranked.map(r => ({ id: r.id, title: r.title, slug: r.slug, type: r.type, summary: r.excerpt || null, coverImageUrl: recs.articles.find(a => a.id === r.id)?.coverImageUrl ?? null }))
  }

  await trackAiRecommendationShown({ supabase, source: 'web', userId: user.id }, 'onboarding_starting_point', recs.articles.map(a => a.id))

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link href="/" className="auth-brand">Product Slice HQ</Link>
      </header>
      <main className="auth-main">
        <div className="auth-card" style={{ maxWidth: '640px' }}>
          <div className="auth-card-inner">
            <p className="text-label-sm" style={{ color: 'var(--color-accent-warm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
              You&apos;re all set{profile.first_name ? `, ${profile.first_name}` : ''}
            </p>
            <h1 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '1.5rem' }}>
              Your recommended starting point
            </h1>

            {recs.primaryPath && (
              <RecCard label="Primary Learning Path" item={recs.primaryPath} />
            )}

            {recs.articles.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Recommended articles</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {recs.articles.map(a => (
                    <Link key={a.id} href={TYPE_HREF.article(a.slug)} className="text-body-md" style={{ color: 'var(--color-ink-deep)', textDecoration: 'none', fontWeight: 500 }}>
                      → {a.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {recs.template && <RecCard label="Template" item={recs.template} />}
            {recs.collection && <RecCard label="Relevant Collection" item={recs.collection} />}

            <Link href="/dashboard" className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '1.5rem' }}>
              Start Learning →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

function RecCard({ label, item }: { label: string; item: { title: string; slug: string; type: string; summary: string | null } }) {
  return (
    <Link href={TYPE_HREF[item.type]?.(item.slug) ?? '#'} style={{
      display: 'block', textDecoration: 'none', marginBottom: '1.25rem',
      padding: '1rem', borderRadius: '0.5rem',
      border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
    }}>
      <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>{label}</p>
      <p className="text-body-md" style={{ color: 'var(--color-ink-deep)', fontWeight: 600, margin: 0 }}>{item.title}</p>
      {item.summary && <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>{item.summary}</p>}
    </Link>
  )
}
