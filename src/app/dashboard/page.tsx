import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { UserRow, ContentRow } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [profileRes, interactionsRes, trendingRes, ownedRes, recommendedRes, coursesRes, trendingEbooksRes, trendingTemplatesRes] = await Promise.all([
    supabase.from('users').select('full_name, areas_of_interest').eq('id', user.id).single(),
    supabase.from('content_interactions')
      .select('id, type, content:content_id(type, pricing_type)')
      .eq('user_id', user.id),
    supabase.from('content')
      .select('id, title, slug, type, view_count, published_at')
      .eq('status', 'published')
      .eq('type', 'article')
      .order('view_count', { ascending: false })
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
      .limit(4),
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
      .limit(4),
    supabase.from('content')
      .select('id, title, slug, cover_image_url, tags, published_at')
      .eq('status', 'published')
      .eq('type', 'template')
      .order('published_at', { ascending: false })
      .limit(4),
  ])

  const profile = profileRes.data as Pick<UserRow, 'full_name' | 'areas_of_interest'> | null
  const interactions = (interactionsRes.data ?? []) as Array<{ id: string; type: string; content: Partial<ContentRow> | null }>
  const trending = (trendingRes.data ?? []) as Array<Pick<ContentRow, 'id' | 'title' | 'slug' | 'type' | 'view_count'>>
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

  const ebooks = owned.filter(c => c.type === 'ebook')
  const articles = interactions.filter(i => i.type === 'view')
  const resources = owned.filter(c => c.type === 'template')
  const paidItems = owned.filter(c => (c as { pricing_type?: string }).pricing_type === 'paid')
  const freeItems = owned.filter(c => (c as { pricing_type?: string }).pricing_type === 'free')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="dash-content">

      {/* ── Welcome banner ── */}
      <section style={{
        background: 'var(--color-ink-deep)',
        borderRadius: '0.875rem',
        padding: '2rem 2.5rem',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(250,204,21,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--color-accent-warm)', marginBottom: '0.5rem',
          }}>
            {greeting}
          </p>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem',
            letterSpacing: '-0.02em', lineHeight: 1.2,
          }}>
            Welcome back, {name}
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: '0.9375rem',
            color: 'rgba(255,255,255,0.55)', margin: 0, maxWidth: '50ch',
          }}>
            Your personal product knowledge hub. Here&apos;s what&apos;s new today.
          </p>
        </div>
        <div style={{
          display: 'flex', gap: '0.75rem', flexShrink: 0, position: 'relative',
        }}>
          <Link href="/library" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.625rem 1.25rem',
            background: 'var(--color-accent-warm)',
            color: 'var(--color-ink-deep)',
            fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700,
            borderRadius: '0.375rem', textDecoration: 'none',
            letterSpacing: '0.02em', whiteSpace: 'nowrap',
          }}>
            Browse Library →
          </Link>
        </div>
      </section>

      {/* ── Stats row ── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '0.75rem',
        marginBottom: '1.75rem',
      }}>
        {[
          { label: 'Content Unlocked', value: owned.length, icon: '🔓', accent: '#FACC15' },
          { label: 'E-books', value: ebooks.length, icon: '📖', accent: '#7c3aed' },
          { label: 'Courses', value: courses.length, icon: '🎓', accent: '#0ea5e9' },
          { label: 'Articles Read', value: articles.length, icon: '📰', accent: '#10b981' },
          { label: 'Resources', value: resources.length, icon: '📦', accent: '#f97316' },
          { label: 'Paid', value: paidItems.length, icon: '💎', accent: '#e11d48' },
          { label: 'Free', value: freeItems.length, icon: '🎁', accent: '#6366f1' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#ffffff',
            border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
            borderRadius: '0.625rem',
            padding: '1rem 1rem 0.875rem',
            borderTop: `3px solid ${s.accent}`,
          }}>
            <span style={{ fontSize: '1.125rem' }}>{s.icon}</span>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1.625rem', fontWeight: 800,
              color: 'var(--color-ink-deep)',
              margin: '0.375rem 0 0.125rem', lineHeight: 1,
            }}>
              {s.value}
            </p>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--color-text-muted)',
              margin: 0,
            }}>
              {s.label}
            </p>
          </div>
        ))}
      </section>

      {/* ── Two column: Trending + My Library ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '1.25rem', marginBottom: '1.75rem',
      }}>
        {/* Trending Articles */}
        <section style={{
          background: '#ffffff',
          border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
          borderRadius: '0.75rem', overflow: 'hidden',
        }}>
          <div style={{
            padding: '1.25rem 1.5rem 1rem',
            borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 6%, transparent)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
              fontWeight: 700, color: 'var(--color-ink-deep)',
              margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              🔥 Trending Now
            </h3>
            <Link href="/articles" style={{
              fontSize: '0.75rem', color: 'var(--color-text-muted)',
              textDecoration: 'none', fontFamily: 'var(--font-sans)', fontWeight: 600,
            }}>
              All articles →
            </Link>
          </div>
          <div style={{ padding: '0 1.5rem' }}>
            {trending.length === 0 ? (
              <p style={{ padding: '1.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)' }}>
                Nothing trending yet.
              </p>
            ) : trending.slice(0, 5).map((c, i) => (
              <Link key={c.id} href={`/articles/${c.slug}`} style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '0.75rem 0',
                borderBottom: i < 4 ? '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)' : 'none',
                textDecoration: 'none',
              }}>
                <span style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.8125rem', fontWeight: 800,
                  color: i === 0 ? 'var(--color-accent-warm)' : 'color-mix(in srgb, var(--color-text-muted) 50%, transparent)',
                  width: '1.25rem', flexShrink: 0, lineHeight: 1,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{
                  fontFamily: 'var(--font-sans)',
                  flex: 1, color: 'var(--color-ink-deep)', fontWeight: 500,
                  fontSize: '0.875rem', lineHeight: 1.4,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                }}>
                  {c.title}
                </span>
                <span style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.6875rem', color: 'var(--color-text-muted)',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {c.view_count ?? 0} views
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* My Library preview */}
        <section style={{
          background: '#ffffff',
          border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
          borderRadius: '0.75rem', overflow: 'hidden',
        }}>
          <div style={{
            padding: '1.25rem 1.5rem 1rem',
            borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 6%, transparent)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
              fontWeight: 700, color: 'var(--color-ink-deep)',
              margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              📚 My Library
            </h3>
            <Link href="/dashboard/library" style={{
              fontSize: '0.75rem', color: 'var(--color-text-muted)',
              textDecoration: 'none', fontFamily: 'var(--font-sans)', fontWeight: 600,
            }}>
              View all →
            </Link>
          </div>
          <div style={{ padding: '0 1.5rem' }}>
            {owned.length === 0 ? (
              <div style={{ padding: '2rem 0', textAlign: 'center' }}>
                <p style={{
                  color: 'var(--color-text-muted)', fontSize: '0.875rem',
                  fontFamily: 'var(--font-sans)', marginBottom: '1rem',
                }}>
                  No content unlocked yet.
                </p>
                <Link href="/library" style={{
                  display: 'inline-flex', padding: '0.5rem 1.125rem',
                  background: 'var(--color-ink-deep)', color: '#fff',
                  borderRadius: '0.375rem', fontSize: '0.8125rem',
                  fontFamily: 'var(--font-sans)', fontWeight: 600, textDecoration: 'none',
                }}>
                  Explore library →
                </Link>
              </div>
            ) : owned.slice(0, 5).map((c, i) => {
              const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
                article: { bg: '#e0eaff', text: '#3451b2' },
                ebook: { bg: '#f3e8ff', text: '#7c3aed' },
                template: { bg: '#d1fae5', text: '#065f46' },
                course: { bg: '#fef3c7', text: '#92400e' },
                resource: { bg: '#ffe4e6', text: '#9f1239' },
              }
              const colors = TYPE_COLORS[c.type ?? ''] ?? { bg: '#f3f4f6', text: '#374151' }
              return (
                <Link key={c.id} href={c.type === 'article' ? `/articles/${c.slug}` : `/content/${c.slug}`} style={{
                  display: 'flex', alignItems: 'center', gap: '0.875rem',
                  padding: '0.75rem 0',
                  borderBottom: i < Math.min(owned.length, 5) - 1 ? '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)' : 'none',
                  textDecoration: 'none',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-sans)', flex: 1,
                    color: 'var(--color-ink-deep)', fontWeight: 500,
                    fontSize: '0.875rem', lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {c.title}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    display: 'inline-flex', padding: '0.15rem 0.5rem',
                    background: colors.bg, color: colors.text,
                    borderRadius: '0.2rem', fontSize: '0.625rem',
                    fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', flexShrink: 0,
                  }}>
                    {c.type}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      </div>

      {/* ── Recommended for You ── */}
      {recommended.length > 0 && (
        <section style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-serif)', fontSize: '1.25rem',
                fontWeight: 700, color: 'var(--color-ink-deep)', margin: '0 0 0.2rem',
              }}>
                Recommended for You
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>
                {interests.length > 0 ? `Based on your ${interests.length} interest areas` : 'Latest from the knowledge base'}
              </p>
            </div>
            <Link href="/articles" style={{
              fontSize: '0.8125rem', color: 'var(--color-text-muted)',
              textDecoration: 'none', fontFamily: 'var(--font-sans)', fontWeight: 600,
            }}>
              All articles →
            </Link>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: '1rem',
          }}>
            {recommended.map(article => (
              <Link key={article.id} href={`/articles/${article.slug}`} style={{
                display: 'flex', flexDirection: 'column',
                background: '#ffffff',
                border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
                borderRadius: '0.75rem', overflow: 'hidden',
                textDecoration: 'none',
                transition: 'box-shadow 200ms, transform 200ms',
              }}
              className="content-card"
              >
                {article.cover_image_url ? (
                  <img
                    src={article.cover_image_url} alt={article.title}
                    style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '80px',
                    background: 'linear-gradient(135deg, var(--color-ink-deep) 0%, color-mix(in srgb, var(--color-ink-deep) 60%, var(--color-accent-warm)) 100%)',
                  }} />
                )}
                <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {article.tags && article.tags.length > 0 && (
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: '0.625rem',
                      fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: 'var(--color-accent-warm)', display: 'block', marginBottom: '0.375rem',
                      background: 'color-mix(in srgb, var(--color-accent-warm) 12%, transparent)',
                      padding: '0.15rem 0.5rem', borderRadius: '0.2rem',
                      width: 'fit-content',
                    }}>
                      {article.tags[0]}
                    </span>
                  )}
                  <p style={{
                    fontFamily: 'var(--font-sans)', fontWeight: 600,
                    color: 'var(--color-ink-deep)', margin: '0 0 0.5rem', lineHeight: 1.4,
                    fontSize: '0.9375rem', flex: 1,
                  }}>
                    {article.title}
                  </p>
                  {article.summary && (
                    <p style={{
                      fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
                      color: 'var(--color-text-muted)', margin: '0 0 0.75rem', lineHeight: 1.5,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                    }}>
                      {article.summary}
                    </p>
                  )}
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
                    color: 'var(--color-ink-deep)', fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}>
                    Read article →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── E-books + Templates bento ── */}
      {(trendingEbooks.length > 0 || trendingTemplates.length > 0) && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '1.25rem', marginBottom: '1.75rem',
        }}>
          {/* E-books */}
          {trendingEbooks.length > 0 && (
            <section style={{
              background: '#ffffff',
              border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
              borderRadius: '0.75rem', overflow: 'hidden',
            }}>
              <div style={{
                padding: '1.25rem 1.5rem 1rem',
                borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 6%, transparent)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <h3 style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                  fontWeight: 700, color: 'var(--color-ink-deep)',
                  margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  📖 E-books
                </h3>
                <Link href="/library?type=ebook" style={{
                  fontSize: '0.75rem', color: 'var(--color-text-muted)',
                  textDecoration: 'none', fontFamily: 'var(--font-sans)', fontWeight: 600,
                }}>All →</Link>
              </div>
              <div style={{ padding: '0.5rem 1rem' }}>
                {trendingEbooks.map((ebook, i) => (
                  <Link key={ebook.id} href={`/content/${ebook.slug}`} style={{
                    display: 'flex', gap: '0.875rem', alignItems: 'center',
                    padding: '0.75rem 0.5rem',
                    borderBottom: i < trendingEbooks.length - 1 ? '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)' : 'none',
                    textDecoration: 'none', borderRadius: '0.375rem',
                    transition: 'background 150ms',
                  }}>
                    {ebook.cover_image_url ? (
                      <img src={ebook.cover_image_url} alt={ebook.title} style={{
                        width: '44px', height: '60px', objectFit: 'cover',
                        borderRadius: '0.25rem', flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      }} />
                    ) : (
                      <div style={{
                        width: '44px', height: '60px', borderRadius: '0.25rem', flexShrink: 0,
                        background: 'linear-gradient(160deg, #7c3aed, #4f46e5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.25rem',
                      }}>📚</div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{
                        fontFamily: 'var(--font-sans)', fontWeight: 600,
                        color: 'var(--color-ink-deep)', margin: '0 0 0.25rem',
                        lineHeight: 1.35, fontSize: '0.875rem',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ebook.title}
                      </p>
                      {ebook.tags && ebook.tags.length > 0 && (
                        <span style={{
                          fontFamily: 'var(--font-sans)', fontSize: '0.6875rem',
                          color: 'var(--color-text-muted)',
                        }}>
                          {ebook.tags[0]}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>→</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Templates */}
          {trendingTemplates.length > 0 && (
            <section style={{
              background: '#ffffff',
              border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
              borderRadius: '0.75rem', overflow: 'hidden',
            }}>
              <div style={{
                padding: '1.25rem 1.5rem 1rem',
                borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 6%, transparent)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <h3 style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                  fontWeight: 700, color: 'var(--color-ink-deep)',
                  margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  📋 Templates
                </h3>
                <Link href="/library?type=template" style={{
                  fontSize: '0.75rem', color: 'var(--color-text-muted)',
                  textDecoration: 'none', fontFamily: 'var(--font-sans)', fontWeight: 600,
                }}>All →</Link>
              </div>
              <div style={{ padding: '0.5rem 1rem' }}>
                {trendingTemplates.map((template, i) => (
                  <Link key={template.id} href={`/content/${template.slug}`} style={{
                    display: 'flex', gap: '0.875rem', alignItems: 'center',
                    padding: '0.75rem 0.5rem',
                    borderBottom: i < trendingTemplates.length - 1 ? '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)' : 'none',
                    textDecoration: 'none',
                  }}>
                    {template.cover_image_url ? (
                      <img src={template.cover_image_url} alt={template.title} style={{
                        width: '52px', height: '52px', objectFit: 'cover',
                        borderRadius: '0.375rem', flexShrink: 0,
                      }} />
                    ) : (
                      <div style={{
                        width: '52px', height: '52px', borderRadius: '0.375rem', flexShrink: 0,
                        background: 'linear-gradient(160deg, #0ea5e9, #0284c7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.25rem',
                      }}>📋</div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{
                        fontFamily: 'var(--font-sans)', fontWeight: 600,
                        color: 'var(--color-ink-deep)', margin: '0 0 0.25rem',
                        lineHeight: 1.35, fontSize: '0.875rem',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {template.title}
                      </p>
                      {template.tags && template.tags.length > 0 && (
                        <span style={{
                          fontFamily: 'var(--font-sans)', fontSize: '0.6875rem',
                          color: 'var(--color-text-muted)',
                        }}>
                          {template.tags[0]}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>→</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Courses ── */}
      <section style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: '1.25rem',
            fontWeight: 700, color: 'var(--color-ink-deep)', margin: 0,
          }}>
            Courses
          </h2>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '1rem',
        }}>
          {(courses.length > 0 ? courses.map(c => ({ id: c.id, title: c.title, tag: c.tags?.[0] ?? null })) : COMING_SOON_COURSES).map(course => (
            <div key={course.id} style={{
              background: '#ffffff',
              border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
              borderRadius: '0.75rem', overflow: 'hidden',
              opacity: 0.85,
            }}>
              <div style={{
                width: '100%', height: '90px',
                background: 'linear-gradient(135deg, var(--color-ink-deep) 0%, color-mix(in srgb, var(--color-ink-deep) 70%, #4f46e5) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
                <span style={{
                  position: 'absolute', top: '0.5rem', right: '0.5rem',
                  background: 'rgba(250,204,21,0.9)', color: 'var(--color-ink-deep)',
                  fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em',
                  textTransform: 'uppercase', padding: '0.2rem 0.5rem', borderRadius: '0.2rem',
                }}>Coming Soon</span>
              </div>
              <div style={{ padding: '0.875rem' }}>
                <p style={{
                  fontFamily: 'var(--font-sans)', fontWeight: 600,
                  color: 'var(--color-ink-deep)', margin: '0 0 0.375rem', lineHeight: 1.35,
                  fontSize: '0.875rem',
                }}>
                  {course.title}
                </p>
                {'tag' in course && course.tag && (
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: '0.6875rem',
                    color: 'var(--color-text-muted)',
                  }}>
                    {course.tag}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quick actions ── */}
      <section style={{ paddingTop: '0.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link href="/library" className="btn-primary">Browse Library</Link>
        <Link href="/articles" className="btn-outline">Read Articles</Link>
        <Link href="/dashboard/requests" className="btn-outline">Request Content</Link>
      </section>
    </div>
  )
}

const COMING_SOON_COURSES = [
  { id: 'cs-1', title: 'Product Strategy & Roadmapping', tag: 'Strategy' },
  { id: 'cs-2', title: 'User Research & Discovery Methods', tag: 'Research' },
  { id: 'cs-3', title: 'Data-Driven Product Decisions', tag: 'Analytics' },
]
