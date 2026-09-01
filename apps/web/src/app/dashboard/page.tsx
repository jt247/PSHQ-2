import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Layers, BookOpen, GraduationCap, Newspaper, Package } from 'lucide-react'
import { createClient } from '@pshq/api-client/server'
import { getTopCommunityMembers } from '@pshq/api-client/queries'
import type { UserRow, ContentRow, OnboardingProgressRow } from '@pshq/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [
    profileRes, interactionsRes, trendingRes, recommendedRes, coursesRes, trendingEbooksRes, trendingTemplatesRes,
    commentCountRes, upvoteCountRes, activityInteractionsRes, leaderboard, onboardingProgressRes,
  ] = await Promise.all([
    supabase.from('users').select('full_name, areas_of_interest, onboarding_done').eq('id', user.id).single(),
    supabase.from('content_interactions')
      .select('id, type, content:content_id(id, title, slug, type, cover_image_url, pricing_type)')
      .eq('user_id', user.id)
      .in('type', ['view', 'download']),
    supabase.from('content')
      .select('id, title, slug, type, view_count, published_at')
      .eq('status', 'published')
      .eq('type', 'article')
      .order('view_count', { ascending: false })
      .limit(6),
    supabase.from('content')
      .select('id, title, slug, summary, cover_image_url, tags, published_at')
      .eq('status', 'published')
      .eq('type', 'article')
      .order('published_at', { ascending: false })
      .limit(30),
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
    // Your Activity — every action a user can take on the platform.
    // content_comments/content_upvotes are public-read, so the RLS-bound
    // client sees these fine; content_interactions is self-read only, which
    // is exactly what's needed here since this is the user's own activity.
    supabase.from('content_comments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('content_upvotes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('content_interactions').select('type').eq('user_id', user.id).in('type', ['share', 'ai_summary_requested', 'download']),
    getTopCommunityMembers(10),
    supabase.from('onboarding_progress').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  const profile = profileRes.data as Pick<UserRow, 'full_name' | 'areas_of_interest' | 'onboarding_done'> | null
  const onboardingProgress = onboardingProgressRes.data as OnboardingProgressRow | null
  const onboardingSteps = onboardingProgress
    ? [onboardingProgress.about_you_completed_at, onboardingProgress.role_completed_at, onboardingProgress.experience_completed_at, onboardingProgress.goals_completed_at, onboardingProgress.topics_completed_at]
    : []
  const onboardingStepsDone = onboardingSteps.filter(Boolean).length
  const interactions = (interactionsRes.data ?? []) as Array<{ id: string; type: string; content: Partial<ContentRow> | null }>
  const trending = (trendingRes.data ?? []) as Array<Pick<ContentRow, 'id' | 'title' | 'slug' | 'type' | 'view_count'>>

  // Distinct content the user has engaged with (viewed or downloaded),
  // deduplicated by content id. There is no 'unlock' interaction type
  // written anywhere in the app — everything free is available to any
  // signed-in user — so "unlocked" here means "content you've actually
  // opened," matching what /dashboard/library already shows correctly.
  const engagedById = new Map<string, Partial<ContentRow>>()
  for (const i of interactions) {
    if (i.content?.id && !engagedById.has(i.content.id)) engagedById.set(i.content.id, i.content)
  }
  const owned = Array.from(engagedById.values())

  const recommendedPool = (recommendedRes.data ?? []) as Array<{
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

  // v1 recommendation engine: score each article by how many of the user's
  // interest areas overlap its tags (case-insensitive — tags are freeform
  // admin text, areas_of_interest are fixed preset labels, so casing between
  // the two was never guaranteed to match). Ties fall back to newest first.
  // With no interests set, this reduces to the previous newest-first behavior.
  const interestSet = new Set(interests.map(i => i.toLowerCase()))
  const recommended = [...recommendedPool]
    .map(article => ({
      article,
      score: (article.tags ?? []).filter(t => interestSet.has(t.toLowerCase())).length,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return (b.article.published_at ?? '').localeCompare(a.article.published_at ?? '')
    })
    .slice(0, 4)
    .map(r => r.article)

  const ebooks = owned.filter(c => c.type === 'ebook')
  const articles = owned.filter(c => c.type === 'article')
  const resources = owned.filter(c => c.type === 'template')

  // Your Activity — every action type a user can take, counted for them.
  const activityInteractions = (activityInteractionsRes.data ?? []) as Array<{ type: string }>
  const activityCounts = {
    comments: commentCountRes.count ?? 0,
    upvotes: upvoteCountRes.count ?? 0,
    shares: activityInteractions.filter(i => i.type === 'share').length,
    aiSummaries: activityInteractions.filter(i => i.type === 'ai_summary_requested').length,
    downloads: activityInteractions.filter(i => i.type === 'download').length,
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="dash-content">

      {/* ── Welcome banner ── */}
      <section className="flex-wrap-mobile" style={{
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

      {/* ── Onboarding progress card (Epic A.4) — templates/downloads/
          ebooks/etc. are gated on this being complete; articles aren't. */}
      {!profile?.onboarding_done && (
        <section style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.75rem',
          padding: '1.25rem 1.5rem', marginBottom: '1.75rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <p className="text-body-md" style={{ fontWeight: 700, color: 'var(--color-ink-deep)', margin: '0 0 0.375rem' }}>
              Finish setting up your profile
            </p>
            <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', margin: '0 0 0.625rem' }}>
              {onboardingStepsDone} of 5 steps completed — unlock templates, ebook downloads, and personalized recommendations.
            </p>
            <div style={{ display: 'flex', gap: '0.25rem', maxWidth: '260px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: '4px', borderRadius: '2px',
                  background: i < onboardingStepsDone ? '#f59e0b' : '#fde68a',
                }} />
              ))}
            </div>
          </div>
          <Link href="/onboarding" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
            Continue →
          </Link>
        </section>
      )}

      {/* ── Stats row ── */}
      <section className="grid-collapse-2" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '0.75rem',
        marginBottom: '1.75rem',
      }}>
        {[
          { label: 'Content Interacted With', value: owned.length, Icon: Layers, accent: '#FACC15' },
          { label: 'Articles', value: articles.length, Icon: Newspaper, accent: '#10b981' },
          { label: 'E-books', value: ebooks.length, Icon: BookOpen, accent: '#7c3aed' },
          { label: 'Templates', value: resources.length, Icon: Package, accent: '#f97316' },
          { label: 'Courses', value: courses.length, Icon: GraduationCap, accent: '#0ea5e9' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#ffffff',
            border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
            borderRadius: '0.625rem',
            padding: '1rem 1rem 0.875rem',
            borderTop: `3px solid ${s.accent}`,
          }}>
            <s.Icon size={18} strokeWidth={2} color={s.accent} />
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
      <div className="grid-collapse-1" style={{
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

        {/* Recommended for You */}
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
              ✨ Recommended for You
            </h3>
            <Link href="/articles" style={{
              fontSize: '0.75rem', color: 'var(--color-text-muted)',
              textDecoration: 'none', fontFamily: 'var(--font-sans)', fontWeight: 600,
            }}>
              All articles →
            </Link>
          </div>
          <div style={{ padding: '0 1.5rem' }}>
            {recommended.length === 0 ? (
              <p style={{ padding: '1.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)' }}>
                Nothing recommended yet.
              </p>
            ) : recommended.map((article, i) => (
              <Link key={article.id} href={`/articles/${article.slug}`} style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '0.75rem 0',
                borderBottom: i < recommended.length - 1 ? '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)' : 'none',
                textDecoration: 'none',
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{
                    fontFamily: 'var(--font-sans)', fontWeight: 500,
                    color: 'var(--color-ink-deep)', margin: 0,
                    fontSize: '0.875rem', lineHeight: 1.4,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                  }}>
                    {article.title}
                  </p>
                  {article.tags && article.tags.length > 0 && (
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                      {article.tags[0]}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>→</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ── Your Activity ── */}
      <section style={{ marginBottom: '1.75rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: '1.25rem',
          fontWeight: 700, color: 'var(--color-ink-deep)', margin: '0 0 1rem',
        }}>
          Your Activity
        </h2>
        <div className="grid-collapse-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
          {[
            { label: 'Comments Left', value: activityCounts.comments },
            { label: 'Upvotes Given', value: activityCounts.upvotes },
            { label: 'Shares', value: activityCounts.shares },
            { label: 'AI Summaries Used', value: activityCounts.aiSummaries },
            { label: 'Downloads', value: activityCounts.downloads },
          ].map(a => (
            <div key={a.label} style={{
              background: '#ffffff',
              border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
              borderRadius: '0.625rem',
              padding: '1rem',
              textAlign: 'center',
            }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink-deep)', margin: '0 0 0.25rem' }}>
                {a.value}
              </p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>
                {a.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Top Community Member leaderboard ── */}
      <section style={{ marginBottom: '1.75rem' }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
          borderRadius: '0.75rem', overflow: 'hidden',
        }}>
          <div style={{
            padding: '1.25rem 1.5rem 1rem',
            borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 6%, transparent)',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
              fontWeight: 700, color: 'var(--color-ink-deep)',
              margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              🏆 Top Community Member
            </h3>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
              Most engaged members — comments, shares, upvotes, AI summaries, and downloads.
            </p>
          </div>
          <div style={{ padding: '0 1.5rem' }}>
            {leaderboard.length === 0 ? (
              <p style={{ padding: '1.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)' }}>
                No community activity yet.
              </p>
            ) : leaderboard.map((member, i) => (
              <div key={member.userId} style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '0.75rem 0',
                borderBottom: i < leaderboard.length - 1 ? '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)' : 'none',
              }}>
                <span style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.8125rem', fontWeight: 800,
                  color: i === 0 ? 'var(--color-accent-warm)' : 'color-mix(in srgb, var(--color-text-muted) 50%, transparent)',
                  width: '1.25rem', flexShrink: 0, lineHeight: 1,
                }}>
                  {String(member.rank).padStart(2, '0')}
                </span>
                <span style={{
                  fontFamily: 'var(--font-sans)', flex: 1,
                  color: 'var(--color-ink-deep)', fontWeight: 500, fontSize: '0.875rem',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {member.name}
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                  {member.score} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── E-books + Templates bento ── */}
      {(trendingEbooks.length > 0 || trendingTemplates.length > 0) && (
        <div className="grid-collapse-1" style={{
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
                      <img loading="lazy" src={ebook.cover_image_url} alt={ebook.title} style={{
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
                      <img loading="lazy" src={template.cover_image_url} alt={template.title} style={{
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
