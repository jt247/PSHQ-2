import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let featuredArticles: Array<{
    id: string; title: string; slug: string; summary: string | null;
    cover_image_url: string | null; tags: string[] | null; published_at: string | null;
  }> = []

  let topCourses: Array<{
    id: string; title: string; slug: string; summary: string | null;
    cover_image_url: string | null; tags: string[] | null;
  }> = []

  try {
    const { data } = await supabase
      .from('content')
      .select('id, title, slug, summary, cover_image_url, tags, published_at')
      .eq('status', 'published')
      .eq('type', 'article')
      .eq('featured', true)
      .order('published_at', { ascending: false })
      .limit(3)
    featuredArticles = data ?? []
  } catch {
    // featured column may not exist yet — skip section
  }

  let featuredEbooks: Array<{
    id: string; title: string; slug: string; summary: string | null;
    cover_image_url: string | null; tags: string[] | null;
  }> = []

  try {
    const { data } = await supabase
      .from('content')
      .select('id, title, slug, summary, cover_image_url, tags')
      .eq('status', 'published')
      .eq('type', 'ebook')
      .eq('featured', true)
      .order('published_at', { ascending: false })
      .limit(3)
    featuredEbooks = data ?? []
  } catch {
    // ignore
  }

  try {
    const { data } = await supabase
      .from('content')
      .select('id, title, slug, summary, cover_image_url, tags')
      .eq('status', 'published')
      .eq('type', 'course')
      .order('published_at', { ascending: false })
      .limit(3)
    topCourses = data ?? []
  } catch {
    // ignore
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav />

      <main style={{ flex: 1 }}>
        {/* Hero */}
        <section style={{
          minHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--color-paper-base)',
          padding: '5rem var(--spacing-margin-edge)',
        }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: '4rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.75rem',
                background: 'color-mix(in srgb, var(--color-accent-warm) 20%, transparent)',
                borderRadius: '0.125rem',
                width: 'fit-content',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent-warm)', display: 'inline-block' }} />
                <span className="text-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-ink-deep)' }}>
                  The Thoughtful Creator
                </span>
              </span>

              <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', maxWidth: '14ch' }}>
                Practical Product Thinking for Real-World Builders.
              </h1>

              <p className="text-body-lg" style={{ color: 'var(--color-on-surface-variant)', maxWidth: '44ch' }}>
                Master your craft with editorial-grade insights, templates, and courses designed for product managers across Africa. No fluff, just structure.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <Link href={user ? '/dashboard' : '/sign-up'} className="btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '0.9375rem' }}>
                  {user ? 'Go to Dashboard' : 'Get Started'}
                </Link>
                <Link href="/library" className="btn-outline" style={{ padding: '0.875rem 2rem', fontSize: '0.9375rem' }}>
                  Browse Library
                </Link>
              </div>
            </div>

            {/* Right side visual */}
            <div style={{ position: 'relative' }}>
              <div style={{
                aspectRatio: '1',
                borderRadius: '0.75rem',
                border: '1px solid color-mix(in srgb, var(--color-outline-variant) 30%, transparent)',
                overflow: 'hidden',
                background: 'var(--color-paper-darker)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  {/* Editorial decorative block */}
                  <div style={{ width: '80px', height: '80px', background: 'var(--color-ink-deep)', borderRadius: '50%', margin: '0 auto 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/pshq-logo.svg" alt="PSHQ" width={48} height={48} />
                  </div>
                  <p className="text-headline-md" style={{ color: 'var(--color-ink-deep)', marginBottom: '1rem' }}>
                    "Great products start with<br/>deep understanding."
                  </p>
                  <div style={{ width: '40px', height: '3px', background: 'var(--color-accent-warm)', margin: '0 auto' }} />
                </div>
              </div>

              {/* Floating insight card */}
              <div style={{
                position: 'absolute',
                bottom: '-1rem',
                left: '-1rem',
                background: 'var(--color-paper-base)',
                borderLeft: '4px solid var(--color-accent-warm)',
                padding: '1rem 1.25rem',
                boxShadow: '0 8px 30px color-mix(in srgb, var(--color-ink-deep) 10%, transparent)',
                maxWidth: '220px',
              }}>
                <p className="text-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Community</p>
                <p className="text-headline-md" style={{ fontSize: '1.125rem', color: 'var(--color-ink-deep)', margin: 0 }}>Built for African PMs</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-darker)' }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
            <div style={{ maxWidth: '42ch', marginBottom: '3rem' }}>
              <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>
                What we offer
              </p>
              <h2 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '1rem' }}>
                Your space for synthesis and deep work.
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
              {[
                {
                  href: '/library',
                  label: 'Resource Library',
                  desc: 'Templates, ebooks, and courses built for the African PM context. Practical tools you can apply immediately.',
                  icon: '📚',
                },
                {
                  href: '/articles',
                  label: 'Articles',
                  desc: 'Frameworks and insights from practitioners across the continent. Deep reading for deep thinkers.',
                  icon: '✍️',
                },
                {
                  href: '/initiatives',
                  label: 'Initiatives',
                  desc: 'Community programs, cohorts, and events. Hands-on learning with fellow builders.',
                  icon: '🚀',
                },
              ].map(({ href, label, desc, icon }) => (
                <Link key={href} href={href} style={{
                  display: 'block',
                  background: 'var(--color-paper-base)',
                  border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
                  borderRadius: '0.5rem',
                  padding: '1.75rem',
                  textDecoration: 'none',
                  transition: 'transform 200ms, box-shadow 200ms',
                }} className="bento-feature-card">
                  <span style={{ fontSize: '1.75rem', display: 'block', marginBottom: '1rem' }}>{icon}</span>
                  <h3 className="text-headline-md" style={{ fontSize: '1.125rem', color: 'var(--color-ink-deep)', margin: '0 0 0.625rem' }}>{label}</h3>
                  <p className="text-body-md" style={{ color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.7 }}>{desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Articles */}
        {featuredArticles.length > 0 && (
          <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-base)' }}>
            <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>
                    Featured reading
                  </p>
                  <h2 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', margin: 0 }}>
                    Start here.
                  </h2>
                </div>
                <Link href="/articles" className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', textDecoration: 'none' }}>
                  All articles →
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
                {featuredArticles.map(article => (
                  <Link key={article.id} href={`/articles/${article.slug}`} style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)', background: 'var(--color-paper-darker)', transition: 'transform 200ms, box-shadow 200ms' }} className="article-feature-card">
                    {article.cover_image_url && (
                      <img
                        src={article.cover_image_url}
                        alt={article.title}
                        style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                      />
                    )}
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      {article.tags && article.tags.length > 0 && (
                        <span className="text-label-sm" style={{ color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                          {article.tags[0]}
                        </span>
                      )}
                      <h3 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: '0 0 0.75rem', fontSize: '1.0625rem', lineHeight: 1.4 }}>
                        {article.title}
                      </h3>
                      {article.summary && (
                        <p className="text-body-md" style={{ color: 'var(--color-text-muted)', margin: '0 0 1.25rem', lineHeight: 1.65, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {article.summary}
                        </p>
                      )}
                      <span className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', marginTop: 'auto' }}>
                        Read article →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Featured Ebooks */}
        {featuredEbooks.length > 0 && (
          <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-darker)' }}>
            <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>
                    Free E-books
                  </p>
                  <h2 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', margin: 0 }}>
                    Take something with you.
                  </h2>
                </div>
                <Link href="/library?type=ebook" className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', textDecoration: 'none' }}>
                  All e-books →
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
                {featuredEbooks.map(ebook => (
                  <Link key={ebook.id} href={`/content/${ebook.slug}`} style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)', background: 'var(--color-paper-base)', transition: 'transform 200ms, box-shadow 200ms' }} className="article-feature-card">
                    {ebook.cover_image_url && (
                      <img src={ebook.cover_image_url} alt={ebook.title} style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }} />
                    )}
                    <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: 'color-mix(in srgb, var(--color-ink-deep) 10%, transparent)', color: 'var(--color-ink-deep)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>E-book</span>
                        <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>Free</span>
                      </div>
                      <h3 className="text-body-lg" style={{ margin: '0 0 0.5rem', fontWeight: 600, lineHeight: 1.4, color: 'var(--color-ink-deep)' }}>
                        {ebook.title}
                      </h3>
                      {ebook.summary && (
                        <p className="text-body-sm" style={{ margin: '0 0 1rem', color: 'var(--color-text-muted)', lineHeight: 1.6, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                          {ebook.summary}
                        </p>
                      )}
                      <span className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', marginTop: 'auto' }}>
                        Download free →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Top Courses */}
        {topCourses.length > 0 && (
          <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-darker)' }}>
            <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>
                    Courses
                  </p>
                  <h2 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', margin: 0 }}>
                    Coming soon.
                  </h2>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
                {topCourses.map(course => (
                  <div key={course.id} style={{
                    display: 'flex', flexDirection: 'column',
                    borderRadius: '0.5rem', overflow: 'hidden',
                    border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
                    background: 'var(--color-paper-base)',
                    opacity: 0.85,
                    cursor: 'default',
                  }} aria-disabled="true">
                    {course.cover_image_url && !course.cover_image_url.startsWith('PLACEHOLDER') ? (
                      <div style={{ position: 'relative' }}>
                        <img src={course.cover_image_url} alt={course.title} style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }} />
                        <span style={{
                          position: 'absolute', top: '0.625rem', right: '0.625rem',
                          background: 'oklch(55% 0.14 85)', color: '#fff',
                          fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em',
                          textTransform: 'uppercase', padding: '0.25rem 0.625rem', borderRadius: '0.25rem',
                        }}>Coming Soon</span>
                      </div>
                    ) : (
                      <div style={{
                        width: '100%', height: '100px',
                        background: 'color-mix(in srgb, var(--color-ink-deep) 8%, transparent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', position: 'relative',
                      }}>
                        🎓
                        <span style={{
                          position: 'absolute', top: '0.625rem', right: '0.625rem',
                          background: 'oklch(55% 0.14 85)', color: '#fff',
                          fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em',
                          textTransform: 'uppercase', padding: '0.25rem 0.625rem', borderRadius: '0.25rem',
                        }}>Coming Soon</span>
                      </div>
                    )}
                    <div style={{ padding: '1.25rem', flex: 1 }}>
                      <span className="badge" style={{
                        background: 'color-mix(in srgb, var(--color-ink-deep) 10%, transparent)',
                        color: 'var(--color-ink-deep)', textTransform: 'uppercase',
                        letterSpacing: '0.06em', marginBottom: '0.625rem', display: 'inline-block',
                      }}>Course</span>
                      <p className="text-body-lg" style={{ margin: '0 0 0.625rem', fontWeight: 600, lineHeight: 1.4, color: 'var(--color-ink-deep)' }}>
                        {course.title}
                      </p>
                      {course.summary && (
                        <p className="text-body-sm" style={{
                          margin: 0, color: 'var(--color-text-muted)', lineHeight: 1.55,
                          overflow: 'hidden', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        } as React.CSSProperties}>
                          {course.summary}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        {!user && (
          <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-ink-deep)' }}>
            <div style={{ maxWidth: '80rem', margin: '0 auto', textAlign: 'center' }}>
              <h2 className="text-headline-lg" style={{ color: '#ffffff', marginBottom: '1rem' }}>
                Ready to level up your PM craft?
              </h2>
              <p className="text-body-lg" style={{ color: 'var(--color-primary-fixed-dim)', marginBottom: '2rem', maxWidth: '44ch', margin: '0 auto 2rem' }}>
                Join thousands of product managers across Africa who are building with intention.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/sign-up" className="btn-accent" style={{ padding: '0.875rem 2rem', fontSize: '0.9375rem' }}>
                  Join free →
                </Link>
                <Link href="/library" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.875rem 2rem',
                  border: '1px solid rgba(175,200,237,0.4)',
                  borderRadius: '0.25rem',
                  color: 'var(--color-primary-fixed-dim)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'border-color 150ms',
                }}>
                  Browse the library
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <PublicFooter />

      <style>{`
        .bento-feature-card:hover, .article-feature-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px color-mix(in srgb, var(--color-ink-deep) 8%, transparent);
        }
      `}</style>
    </div>
  )
}
