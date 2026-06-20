import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { UserRow, ContentRow } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [profileRes, statsRes, trendingRes, ownedRes, recommendedRes, coursesRes, trendingEbooksRes, trendingTemplatesRes] = await Promise.all([
    supabase.from('users').select('full_name, areas_of_interest').eq('id', user.id).single(),
    supabase.from('content_interactions')
      .select('id, type', { count: 'exact' })
      .eq('user_id', user.id),
    supabase.from('content')
      .select('id, title, slug, type, view_count, upvote_count, published_at')
      .eq('status', 'published')
      .eq('type', 'article')
      .order('published_at', { ascending: false })
      .limit(6),
    supabase.from('content_interactions')
      .select('content:content_id(id, title, slug, type, cover_image_url, pricing_type)')
      .eq('user_id', user.id)
      .in('type', ['unlock'])
      .limit(6),
    supabase.from('content')
      .select('id, title, slug, summary, cover_image_url, tags, published_at')
      .eq('status', 'published')
      .eq('type', 'article')
      .order('published_at', { ascending: false })
      .limit(3),
    supabase.from('content')
      .select('id, title, slug, summary, cover_image_url, tags')
      .eq('status', 'published')
      .eq('type', 'course')
      .order('published_at', { ascending: false })
      .limit(3),
    supabase.from('content')
      .select('id, title, slug, cover_image_url, tags, published_at')
      .eq('status', 'published')
      .eq('type', 'ebook')
      .order('published_at', { ascending: false })
      .limit(3),
    supabase.from('content')
      .select('id, title, slug, cover_image_url, tags, published_at')
      .eq('status', 'published')
      .eq('type', 'template')
      .order('published_at', { ascending: false })
      .limit(3),
  ])

  const profile = profileRes.data as Pick<UserRow, 'full_name' | 'areas_of_interest'> | null
  const interactionCount = statsRes.count ?? 0
  const trending = (trendingRes.data ?? []) as Array<Pick<ContentRow, 'id' | 'title' | 'slug' | 'type' | 'view_count' | 'upvote_count'>>
  const ownedRaw = (ownedRes.data ?? []) as Array<{ content: Partial<ContentRow> | null }>
  const owned = ownedRaw.map(r => r.content).filter(Boolean) as Array<Partial<ContentRow>>
  const recommended = (recommendedRes.data ?? []) as Array<{
    id: string; title: string; slug: string; summary: string | null;
    cover_image_url: string | null; tags: string[] | null; published_at: string | null;
  }>
  const courses = (coursesRes.data ?? []) as Array<{
    id: string; title: string; slug: string; summary: string | null;
    cover_image_url: string | null; tags: string[] | null;
  }>
  const trendingEbooks = (trendingEbooksRes.data ?? []) as Array<{
    id: string; title: string; slug: string;
    cover_image_url: string | null; tags: string[] | null;
  }>
  const trendingTemplates = (trendingTemplatesRes.data ?? []) as Array<{
    id: string; title: string; slug: string;
    cover_image_url: string | null; tags: string[] | null;
  }>

  const name = profile?.full_name?.split(' ')[0] ?? 'there'
  const interests = (profile?.areas_of_interest as string[] | null) ?? []

  const TYPE_BG: Record<string, string> = {
    article: 'color-mix(in srgb, var(--color-primary-fixed) 40%, transparent)',
    ebook: '#fce7f3',
    template: '#dcfce7',
    course: '#fef3c7',
  }
  const TYPE_COLOR: Record<string, string> = {
    article: 'var(--color-on-primary-fixed-variant)',
    ebook: '#be185d',
    template: '#15803d',
    course: '#b45309',
  }

  return (
    <div className="dash-content">
      {/* Welcome Header */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.375rem' }}>
          Welcome back, {name}
        </h2>
        <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', maxWidth: '56ch' }}>
          Your personal library of synthesis and deep work. Here&apos;s what&apos;s happening with your curated insights today.
        </p>
      </section>

      {/* Stat Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Content Unlocked', value: owned.length, icon: '🔓' },
          { label: 'Interactions', value: interactionCount, icon: '📈' },
          { label: 'Interest Areas', value: interests.length, icon: '🎯' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <span style={{ fontSize: '1.125rem' }}>{s.icon}</span>
            <div style={{ marginTop: '0.5rem' }}>
              <p className="text-headline-lg" style={{ margin: '0', color: 'var(--color-ink-deep)' }}>{s.value}</p>
              <p className="text-label-sm" style={{ margin: '0.125rem 0 0', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Two Column */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1.5rem' }}>
        {/* Trending Content */}
        <section style={{ background: 'var(--color-paper-darker)', border: '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)', borderRadius: '0.75rem', padding: '1.5rem' }}>
          <h3 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: '0 0 1.25rem', fontSize: '1.125rem' }}>
            Trending Articles
          </h3>
          {trending.length === 0 ? (
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)' }}>Nothing trending yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {trending.map((c, i) => (
                <Link
                  key={c.id}
                  href={c.type === 'article' ? `/articles/${c.slug}` : `/content/${c.slug}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)',
                    textDecoration: 'none',
                  }}
                >
                  <span className="text-label-sm" style={{ color: 'var(--color-accent-warm)', width: '1.25rem', flexShrink: 0, fontWeight: 700 }}>
                    {i + 1}
                  </span>
                  <span className="text-body-md" style={{ flex: 1, color: 'var(--color-ink-deep)', fontWeight: 500 }}>
                    {c.title}
                  </span>
                  <span className="text-label-sm" style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {c.view_count ?? 0} views
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* My Library */}
        <section style={{ background: 'var(--color-paper-darker)', border: '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)', borderRadius: '0.75rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: 0, fontSize: '1.125rem' }}>
              My Library
            </h3>
            <Link href="/dashboard/library" className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          {owned.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                No content unlocked yet.
              </p>
              <Link href="/library" className="btn-primary" style={{ fontSize: '0.8125rem', padding: '0.5rem 1.125rem' }}>
                Explore library →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {owned.map(c => (
                <Link
                  key={c.id}
                  href={c.type === 'article' ? `/articles/${c.slug}` : `/content/${c.slug}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)',
                    textDecoration: 'none',
                  }}
                >
                  <span className="text-body-md" style={{ flex: 1, color: 'var(--color-ink-deep)', fontWeight: 500 }}>{c.title}</span>
                  <span className="badge" style={{
                    background: TYPE_BG[c.type ?? ''] ?? 'var(--color-surface-container)',
                    color: TYPE_COLOR[c.type ?? ''] ?? 'var(--color-text-muted)',
                  }}>
                    {c.type}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Trending Ebooks */}
      {trendingEbooks.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: 0, fontSize: '1.125rem' }}>
              Trending E-books
            </h3>
            <Link href="/library?type=ebook" className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', textDecoration: 'none' }}>
              All e-books →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem' }}>
            {trendingEbooks.map(ebook => (
              <Link key={ebook.id} href={`/content/${ebook.slug}`} style={{
                display: 'flex', gap: '1rem', alignItems: 'center', textDecoration: 'none',
                background: 'var(--color-paper-darker)',
                border: '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)',
                borderRadius: '0.75rem', padding: '0.875rem',
                transition: 'transform 150ms',
              }} className="dash-ebook-card">
                {ebook.cover_image_url ? (
                  <img src={ebook.cover_image_url} alt={ebook.title} style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '0.25rem', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '52px', height: '52px', background: 'var(--color-paper-base)', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>📚</div>
                )}
                <div style={{ minWidth: 0 }}>
                  <p className="text-body-md" style={{ color: 'var(--color-ink-deep)', fontWeight: 600, margin: '0 0 0.25rem', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ebook.title}
                  </p>
                  {ebook.tags && ebook.tags.length > 0 && (
                    <span className="text-label-sm" style={{ color: 'var(--color-text-muted)' }}>{ebook.tags[0]}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Trending Templates */}
      {trendingTemplates.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: 0, fontSize: '1.125rem' }}>
              Trending Templates
            </h3>
            <Link href="/library?type=template" className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', textDecoration: 'none' }}>
              All templates →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem' }}>
            {trendingTemplates.map(template => (
              <Link key={template.id} href={`/content/${template.slug}`} style={{
                display: 'flex', gap: '1rem', alignItems: 'center', textDecoration: 'none',
                background: 'var(--color-paper-darker)',
                border: '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)',
                borderRadius: '0.75rem', padding: '0.875rem',
                transition: 'transform 150ms',
              }} className="dash-ebook-card">
                {template.cover_image_url ? (
                  <img src={template.cover_image_url} alt={template.title} style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '0.25rem', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '52px', height: '52px', background: 'var(--color-paper-base)', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>📋</div>
                )}
                <div style={{ minWidth: 0 }}>
                  <p className="text-body-md" style={{ color: 'var(--color-ink-deep)', fontWeight: 600, margin: '0 0 0.25rem', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {template.title}
                  </p>
                  {template.tags && template.tags.length > 0 && (
                    <span className="text-label-sm" style={{ color: 'var(--color-text-muted)' }}>{template.tags[0]}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recommended for You */}
      {recommended.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: 0, fontSize: '1.125rem' }}>
              Recommended for You
            </h3>
            <Link href="/articles" className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', textDecoration: 'none' }}>
              All articles →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem' }}>
            {recommended.map(article => (
              <Link key={article.id} href={`/articles/${article.slug}`} style={{
                display: 'flex', flexDirection: 'column', textDecoration: 'none',
                background: 'var(--color-paper-darker)',
                border: '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)',
                borderRadius: '0.75rem', overflow: 'hidden',
              }}>
                {article.cover_image_url && (
                  <img src={article.cover_image_url} alt={article.title} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                )}
                <div style={{ padding: '1rem' }}>
                  {article.tags && article.tags.length > 0 && (
                    <span className="text-label-sm" style={{ color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.375rem' }}>
                      {article.tags[0]}
                    </span>
                  )}
                  <p className="text-body-md" style={{ color: 'var(--color-ink-deep)', fontWeight: 600, margin: '0 0 0.375rem', lineHeight: 1.4 }}>
                    {article.title}
                  </p>
                  <span className="text-label-sm" style={{ color: 'var(--color-on-primary-container)' }}>Read →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Top Courses */}
      {courses.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: 0, fontSize: '1.125rem' }}>
              Top Courses
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem' }}>
            {courses.map(course => (
              <div key={course.id} style={{
                display: 'flex', flexDirection: 'column',
                background: 'var(--color-paper-darker)',
                border: '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)',
                borderRadius: '0.75rem', overflow: 'hidden',
                opacity: 0.82,
                cursor: 'default',
              }} aria-disabled="true">
                {course.cover_image_url && !course.cover_image_url.startsWith('PLACEHOLDER') ? (
                  <div style={{ position: 'relative' }}>
                    <img src={course.cover_image_url} alt={course.title} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                    <span style={{
                      position: 'absolute', top: '0.5rem', right: '0.5rem',
                      background: 'oklch(55% 0.14 85)', color: '#fff',
                      fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em',
                      textTransform: 'uppercase', padding: '0.2rem 0.5rem', borderRadius: '0.2rem',
                    }}>Coming Soon</span>
                  </div>
                ) : (
                  <div style={{
                    width: '100%', height: '80px',
                    background: 'color-mix(in srgb, var(--color-accent-warm) 12%, var(--color-paper-base))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.75rem', position: 'relative',
                  }}>
                    🎓
                    <span style={{
                      position: 'absolute', top: '0.5rem', right: '0.5rem',
                      background: 'oklch(55% 0.14 85)', color: '#fff',
                      fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em',
                      textTransform: 'uppercase', padding: '0.2rem 0.5rem', borderRadius: '0.2rem',
                    }}>Coming Soon</span>
                  </div>
                )}
                <div style={{ padding: '0.875rem' }}>
                  <p className="text-body-md" style={{ color: 'var(--color-ink-deep)', fontWeight: 600, margin: '0 0 0.375rem', lineHeight: 1.35 }}>
                    {course.title}
                  </p>
                  {course.tags && course.tags.length > 0 && (
                    <span className="text-label-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {course.tags[0]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/library" className="btn-primary">Browse Library</Link>
          <Link href="/articles" className="btn-outline">Read Articles</Link>
          <Link href="/dashboard/requests" className="btn-outline">Request Content</Link>
        </div>
      </section>
    </div>
  )
}
