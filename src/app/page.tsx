import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

const INITIATIVES = [
  {
    slug: 'product-lab',
    title: 'Product Lab with JT',
    short_description: 'A hands-on cohort for product practitioners who want to build real intuition — through live sessions, peer critique, and direct access to JT.',
    status: 'live',
  },
  {
    slug: 'case-library',
    title: 'Product Case Library',
    short_description: 'A growing archive of real product teardowns — how teams across Africa and beyond built, iterated, and scaled their products.',
    status: 'live',
  },
  {
    slug: 'curriculum',
    title: 'Open PM Curriculum',
    short_description: 'A freely available, structured learning path covering product fundamentals, analytics, strategy, and leadership.',
    status: 'coming_soon',
  },
]

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let featuredArticles: Array<{
    id: string; title: string; slug: string; summary: string | null;
    cover_image_url: string | null; tags: string[] | null; published_at: string | null;
  }> = []

  let featuredEbooks: Array<{
    id: string; title: string; slug: string; summary: string | null;
    cover_image_url: string | null; tags: string[] | null;
  }> = []

  let featuredTemplates: Array<{
    id: string; title: string; slug: string; summary: string | null;
    cover_image_url: string | null; tags: string[] | null;
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
  } catch { /* featured column may not exist yet */ }

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
  } catch { /* ignore */ }

  try {
    const { data } = await supabase
      .from('content')
      .select('id, title, slug, summary, cover_image_url, tags')
      .eq('status', 'published')
      .eq('type', 'template')
      .order('published_at', { ascending: false })
      .limit(3)
    featuredTemplates = data ?? []
  } catch { /* ignore */ }

  try {
    const { data } = await supabase
      .from('content')
      .select('id, title, slug, summary, cover_image_url, tags')
      .eq('status', 'published')
      .eq('type', 'course')
      .order('published_at', { ascending: false })
      .limit(3)
    topCourses = data ?? []
  } catch { /* ignore */ }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav />

      <main style={{ flex: 1 }}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section style={{
          minHeight: '90vh',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--color-ink-deep)',
          position: 'relative',
          overflow: 'hidden',
          padding: '6rem var(--spacing-margin-edge) 5rem',
        }}>
          {/* depth texture — concentric radial glow from top-right */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `
              radial-gradient(ellipse 70% 60% at 80% 20%, rgba(250,204,21,0.07) 0%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 10% 90%, rgba(99,102,241,0.06) 0%, transparent 60%)
            `,
          }} />
          {/* subtle grid overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }} />

          <div style={{
            maxWidth: '80rem', margin: '0 auto', width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))',
            gap: '4rem', alignItems: 'center',
            position: 'relative', zIndex: 1,
          }}>

            {/* Left — copy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.3rem 0.875rem',
                background: 'rgba(250,204,21,0.12)',
                border: '1px solid rgba(250,204,21,0.25)',
                borderRadius: '0.125rem', width: 'fit-content',
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#FACC15', display: 'inline-block' }} />
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700,
                  letterSpacing: '0.14em', textTransform: 'uppercase', color: '#FACC15',
                }}>
                  For Product Managers, Founders &amp; Growth Teams
                </span>
              </span>

              <h1 style={{
                fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: 1.1,
                letterSpacing: '-0.02em', maxWidth: '14ch',
              }}>
                Practical product thinking for people building{' '}
                <span style={{ color: '#FACC15' }}>real products.</span>
              </h1>

              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: '1.0625rem',
                color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: '44ch', margin: 0,
              }}>
                Articles, e-books, courses, and resources crafted for product managers who want to build what matters.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <Link href={user ? '/dashboard' : '/sign-up'} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: '#FACC15', color: '#0E2A47',
                  fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.9375rem',
                  padding: '0.875rem 2rem', borderRadius: '0.25rem',
                  textDecoration: 'none', transition: 'opacity 150ms',
                }}>
                  {user ? 'Go to Dashboard' : 'Get Started'} →
                </Link>
                <Link href="/library" style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.8)',
                  fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.9375rem',
                  padding: '0.875rem 2rem', borderRadius: '0.25rem',
                  textDecoration: 'none', transition: 'border-color 150ms',
                }}>
                  Browse Library
                </Link>
              </div>

              {/* Social proof strip */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                paddingTop: '0.5rem',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                marginTop: '0.5rem',
              }}>
                <div style={{ display: 'flex' }}>
                  {['#a78bfa', '#6ee7b7', '#fbbf24', '#f9a8d4', '#93c5fd'].map((c, i) => (
                    <div key={i} style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: c, border: '2px solid #0E2A47',
                      marginLeft: i > 0 ? '-8px' : '0', flexShrink: 0,
                    }} />
                  ))}
                </div>
                <p style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
                  color: 'rgba(255,255,255,0.5)', margin: 0,
                }}>
                  Join PMs across Africa building with clarity
                </p>
              </div>
            </div>

            {/* Right — product mockup illustration */}
            <div style={{ position: 'relative' }}>
              <ProductMockup />
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────── */}
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
              {FEATURES.map(({ href, label, desc, Icon }) => (
                <Link key={href} href={href} style={{
                  display: 'block',
                  background: 'var(--color-paper-base)',
                  border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
                  borderRadius: '0.5rem',
                  padding: '1.75rem',
                  textDecoration: 'none',
                  transition: 'transform 200ms, box-shadow 200ms',
                }} className="bento-feature-card">
                  <span style={{ display: 'block', marginBottom: '1rem', color: 'var(--color-ink-deep)' }}>
                    <Icon />
                  </span>
                  <h3 className="text-headline-md" style={{ fontSize: '1.125rem', color: 'var(--color-ink-deep)', margin: '0 0 0.625rem' }}>{label}</h3>
                  <p className="text-body-md" style={{ color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.7 }}>{desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured Articles ─────────────────────────────────────── */}
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
                      <img src={article.cover_image_url} alt={article.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
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

        {/* ── Featured Ebooks ──────────────────────────────────────── */}
        {featuredEbooks.length > 0 && (
          <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-darker)' }}>
            <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>Free E-books</p>
                  <h2 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', margin: 0 }}>Take something with you.</h2>
                </div>
                <Link href="/library?type=ebook" className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', textDecoration: 'none' }}>All e-books →</Link>
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
                      <h3 className="text-body-lg" style={{ margin: '0 0 0.5rem', fontWeight: 600, lineHeight: 1.4, color: 'var(--color-ink-deep)' }}>{ebook.title}</h3>
                      {ebook.summary && (
                        <p className="text-body-sm" style={{ margin: '0 0 1rem', color: 'var(--color-text-muted)', lineHeight: 1.6, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                          {ebook.summary}
                        </p>
                      )}
                      <span className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', marginTop: 'auto' }}>Download free →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Featured Templates ──────────────────────────────────── */}
        {featuredTemplates.length > 0 && (
          <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-base)' }}>
            <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>Templates</p>
                  <h2 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', margin: 0 }}>Ready-to-use frameworks.</h2>
                </div>
                <Link href="/library?type=template" className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', textDecoration: 'none' }}>All templates →</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
                {featuredTemplates.map(template => (
                  <Link key={template.id} href={`/content/${template.slug}`} style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)', background: 'var(--color-paper-darker)', transition: 'transform 200ms, box-shadow 200ms' }} className="article-feature-card">
                    {template.cover_image_url ? (
                      <img src={template.cover_image_url} alt={template.title} style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100px', background: 'color-mix(in srgb, var(--color-ink-deep) 6%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-deep)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.2 }}>
                          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                        </svg>
                      </div>
                    )}
                    <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: 'color-mix(in srgb, var(--color-ink-deep) 10%, transparent)', color: 'var(--color-ink-deep)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Template</span>
                        <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>Free</span>
                      </div>
                      <h3 className="text-body-lg" style={{ margin: '0 0 0.5rem', fontWeight: 600, lineHeight: 1.4, color: 'var(--color-ink-deep)' }}>{template.title}</h3>
                      {template.summary && (
                        <p className="text-body-sm" style={{ margin: '0 0 1rem', color: 'var(--color-text-muted)', lineHeight: 1.6, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                          {template.summary}
                        </p>
                      )}
                      <span className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', marginTop: 'auto' }}>Use template →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Courses ─────────────────────────────────────────────── */}
        {topCourses.length > 0 && (
          <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-darker)' }}>
            <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>Courses</p>
                  <h2 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', margin: 0 }}>Coming soon.</h2>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
                {topCourses.map(course => (
                  <div key={course.id} style={{ display: 'flex', flexDirection: 'column', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)', background: 'var(--color-paper-base)', opacity: 0.85, cursor: 'default' }} aria-disabled="true">
                    <div style={{ width: '100%', height: '100px', background: 'color-mix(in srgb, var(--color-ink-deep) 8%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-deep)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.25 }}>
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                      </svg>
                      <span style={{ position: 'absolute', top: '0.625rem', right: '0.625rem', background: 'rgba(250,204,21,0.9)', color: 'var(--color-ink-deep)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.25rem 0.625rem', borderRadius: '0.25rem' }}>Coming Soon</span>
                    </div>
                    <div style={{ padding: '1.25rem', flex: 1 }}>
                      <span className="badge" style={{ background: 'color-mix(in srgb, var(--color-ink-deep) 10%, transparent)', color: 'var(--color-ink-deep)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem', display: 'inline-block' }}>Course</span>
                      <p className="text-body-lg" style={{ margin: '0 0 0.625rem', fontWeight: 600, lineHeight: 1.4, color: 'var(--color-ink-deep)' }}>{course.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Initiatives ─────────────────────────────────────────── */}
        <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-base)' }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>
                  Initiatives
                </p>
                <h2 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', margin: 0 }}>
                  Programs built for builders.
                </h2>
              </div>
              <Link href="/initiatives" className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', textDecoration: 'none' }}>
                All initiatives →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
              {INITIATIVES.map(initiative => (
                <Link key={initiative.slug} href={`/initiatives/${initiative.slug}`} style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)', background: 'var(--color-paper-darker)', transition: 'transform 200ms, box-shadow 200ms' }} className="article-feature-card">
                  {/* Accent bar */}
                  <div style={{ height: '4px', background: 'var(--color-ink-deep)' }} />
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                      <span style={{
                        fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 700,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        padding: '0.2rem 0.5rem', borderRadius: '0.2rem',
                        background: initiative.status === 'live' ? '#dcfce7' : 'color-mix(in srgb, var(--color-tertiary) 12%, transparent)',
                        color: initiative.status === 'live' ? '#15803d' : 'var(--color-text-muted)',
                      }}>
                        {initiative.status === 'live' ? 'Live' : 'Coming Soon'}
                      </span>
                    </div>
                    <h3 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: '0 0 0.75rem', fontSize: '1.0625rem', lineHeight: 1.4 }}>
                      {initiative.title}
                    </h3>
                    <p className="text-body-md" style={{ color: 'var(--color-text-muted)', margin: '0 0 1.25rem', lineHeight: 1.65, flex: 1 }}>
                      {initiative.short_description}
                    </p>
                    <span className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', marginTop: 'auto' }}>
                      Learn more →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

                {/* ── CTA ─────────────────────────────────────────────────── */}
        {!user && (
          <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-ink-deep)' }}>
            <div style={{ maxWidth: '80rem', margin: '0 auto', textAlign: 'center' }}>
              <h2 className="text-headline-lg" style={{ color: '#ffffff', marginBottom: '1rem' }}>
                Ready to level up your PM craft?
              </h2>
              <p className="text-body-lg" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', maxWidth: '44ch', margin: '0 auto 2rem' }}>
                Join product managers across Africa who are building with intention.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/sign-up" style={{ display: 'inline-flex', alignItems: 'center', background: '#FACC15', color: '#0E2A47', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.9375rem', padding: '0.875rem 2rem', borderRadius: '0.25rem', textDecoration: 'none' }}>
                  Join free →
                </Link>
                <Link href="/library" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.875rem 2rem', border: '1px solid rgba(175,200,237,0.4)', borderRadius: '0.25rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, textDecoration: 'none' }}>
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

/* ── Inline product mockup — zero external dependencies ──────────── */
function ProductMockup() {
  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      {/* Glow behind card */}
      <div style={{
        position: 'absolute', top: '10%', left: '5%', right: '5%', bottom: '5%',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(250,204,21,0.12) 0%, transparent 70%)',
        filter: 'blur(20px)', borderRadius: '1rem', pointerEvents: 'none',
      }} />

      {/* Main dashboard card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.875rem',
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        position: 'relative',
      }}>
        {/* Window chrome */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.03)',
        }}>
          {['#ef4444','#f59e0b','#22c55e'].map((c, i) => (
            <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.7 }} />
          ))}
          <div style={{
            flex: 1, marginLeft: '0.5rem', height: '18px',
            background: 'rgba(255,255,255,0.05)', borderRadius: '0.25rem',
          }} />
        </div>

        {/* Dashboard layout */}
        <div style={{ display: 'flex', height: '340px' }}>
          {/* Mini sidebar */}
          <div style={{
            width: '52px', background: 'rgba(14,42,71,0.8)',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingTop: '1.25rem', gap: '1.25rem',
          }}>
            {/* Logo dot */}
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#FACC15', opacity: 0.9, marginBottom: '0.5rem' }} />
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{
                width: '24px', height: '24px', borderRadius: '0.3rem',
                background: i === 0 ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '1px', background: i === 0 ? '#FACC15' : 'rgba(255,255,255,0.2)' }} />
              </div>
            ))}
          </div>

          {/* Main content area */}
          <div style={{ flex: 1, padding: '1rem', overflow: 'hidden' }}>
            {/* Welcome bar */}
            <div style={{ marginBottom: '0.875rem' }}>
              <div style={{ width: '45%', height: '10px', background: 'rgba(255,255,255,0.15)', borderRadius: '4px', marginBottom: '0.4rem' }} />
              <div style={{ width: '28%', height: '7px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px' }} />
            </div>

            {/* KPI strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.875rem' }}>
              {[
                { accent: '#FACC15', w: '55%' },
                { accent: '#6ee7b7', w: '40%' },
                { accent: '#93c5fd', w: '70%' },
              ].map((k, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderTop: `2px solid ${k.accent}`,
                  borderRadius: '0.375rem', padding: '0.5rem 0.625rem',
                }}>
                  <div style={{ width: k.w, height: '12px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', marginBottom: '0.3rem' }} />
                  <div style={{ width: '60%', height: '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px' }} />
                </div>
              ))}
            </div>

            {/* Two column */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {/* Article list */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.375rem', padding: '0.625rem' }}>
                <div style={{ width: '60%', height: '7px', background: 'rgba(250,204,21,0.4)', borderRadius: '3px', marginBottom: '0.625rem' }} />
                {[1,1,1].map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '0.25rem', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ width: '85%', height: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px', marginBottom: '0.25rem' }} />
                      <div style={{ width: '55%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Ebook / resource list */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.375rem', padding: '0.625rem' }}>
                <div style={{ width: '50%', height: '7px', background: 'rgba(147,197,253,0.4)', borderRadius: '3px', marginBottom: '0.625rem' }} />
                {[1,1,1].map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '0.25rem', background: `rgba(${i===0?'250,204,21':i===1?'110,231,183':'147,197,253'},0.12)`, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ width: '78%', height: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px', marginBottom: '0.25rem' }} />
                      <div style={{ width: '42%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating stat card */}
      <div style={{
        position: 'absolute', bottom: '-1.25rem', left: '-1.25rem',
        background: '#ffffff',
        padding: '0.875rem 1.125rem',
        borderRadius: '0.5rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        minWidth: '170px',
        display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FACC15', flexShrink: 0, marginTop: '3px' }} />
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 0.25rem' }}>
            Global Community
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.0625rem', fontWeight: 700, color: '#0E2A47', margin: 0, lineHeight: 1.3 }}>
            Born in Africa.<br/>Built for the world.
          </p>
        </div>
      </div>

      {/* Floating badge top-right */}
      <div style={{
        position: 'absolute', top: '-0.75rem', right: '-0.75rem',
        background: '#FACC15',
        color: '#0E2A47',
        fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 800,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        padding: '0.4rem 0.75rem', borderRadius: '9999px',
        boxShadow: '0 4px 16px rgba(250,204,21,0.35)',
      }}>
        Member Hub
      </div>
    </div>
  )
}

/* ── Feature card icons ──────────────────────────────────────────── */
function IconLibrary() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}
function IconArticle() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}
function IconInitiatives() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

const FEATURES = [
  {
    href: '/library',
    label: 'Resource Library',
    desc: 'Templates, ebooks, and courses built for the African PM context. Practical tools you can apply immediately.',
    Icon: IconLibrary,
  },
  {
    href: '/articles',
    label: 'Articles',
    desc: 'Frameworks and insights from practitioners across the continent. Deep reading for deep thinkers.',
    Icon: IconArticle,
  },
  {
    href: '/initiatives',
    label: 'Initiatives',
    desc: 'Community programs, cohorts, and events. Hands-on learning with fellow builders.',
    Icon: IconInitiatives,
  },
]
