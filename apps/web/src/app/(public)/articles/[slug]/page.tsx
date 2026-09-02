import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { UpvoteButton } from '@/components/article/UpvoteButton'
import { AiSummaryPanel } from '@/components/article/AiSummaryPanel'
import { ListenButton } from '@/components/article/ListenButton'
import { CommentsSection } from '@/components/article/CommentsSection'
import { RatingWidget } from '@/components/article/RatingWidget'
import { ExercisesSection } from '@/components/content/ExercisesSection'
import { MarkCompleteButton } from '@/components/content/MarkCompleteButton'
import { AutoCompleteTracker } from '@/components/content/AutoCompleteTracker'
import { ShareButton } from '@/components/content/ShareButton'
import { FavoriteButton } from '@/components/content/FavoriteButton'
import { ContinueFromHereSection } from '@/components/content/ContinueFromHereSection'
import { retrieveContinueFromHere } from '@pshq/api-client/ai'
import { JsonLd } from '@/components/seo/JsonLd'
import { articleSchema, breadcrumbSchema } from '@/lib/seo/schema'
import { AUTHOR, DEFAULT_OG_IMAGE, absoluteUrl } from '@/lib/seo/constants'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('content')
    .select('title, summary, cover_image_url')
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('type', 'article')
    .single()

  if (!data) return {}

  const description = data.summary ?? undefined
  const image = data.cover_image_url ?? DEFAULT_OG_IMAGE

  return {
    title: data.title,
    description,
    alternates: { canonical: `/articles/${slug}` },
    openGraph: {
      type: 'article',
      title: data.title,
      description,
      url: `/articles/${slug}`,
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description,
      images: [image],
    },
  }
}

// Article bodies are authored as plain text with markdown-style headings.
// A body that arrives as HTML instead (pasted from an editor, or an imported
// draft) would render its tags as literal text on the page, because JSX
// escapes them. Reduce it to text rather than trusting it into
// dangerouslySetInnerHTML, which would hand an admin-authored field a script
// injection path.
function htmlToText(text: string): string {
  if (!/<\/?[a-z][\s\S]*>/i.test(text)) return text
  return text
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|h[1-6]|li|ul|ol|blockquote)\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#3[49];/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function renderBody(text: string) {
  return htmlToText(text).split(/\n\n+/).map((block, i) => {
    const t = block.trim()
    if (!t) return null
    if (t.startsWith('#### ')) return (
      <h4 key={i} className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: '2.25rem 0 0.625rem', fontSize: '1.0625rem' }}>
        {t.slice(5)}
      </h4>
    )
    if (t.startsWith('### ')) return (
      <h3 key={i} className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: '2.5rem 0 0.75rem', fontSize: '1.25rem' }}>
        {t.slice(4)}
      </h3>
    )
    if (t.startsWith('## ')) return (
      <h2 key={i} className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', margin: '3rem 0 1rem' }}>
        {t.slice(3)}
      </h2>
    )
    return (
      <p key={i} className="text-body-lg" style={{ color: 'var(--color-text-main)', lineHeight: 1.85, marginBottom: '1.25rem' }}>
        {t}
      </p>
    )
  }).filter(Boolean)
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: rawItem, error } = await supabase
    .from('content')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('type', 'article')
    .single()

  if (error || !rawItem) notFound()

  const item = rawItem as Record<string, unknown>

  // Current user (nullable)
  const { data: { user } } = await supabase.auth.getUser()

  // Parallel data fetches
  const [upvoteResult, favoriteResult, commentResult, ratingResult, summaryResult, progressResult, continueFromHere] = await Promise.all([
    // Whether user has upvoted
    user
      ? supabase
          .from('content_upvotes')
          .select('id')
          .eq('content_id', rawItem.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    // Whether user has favorited
    user
      ? supabase
          .from('content_favorites')
          .select('id')
          .eq('content_id', rawItem.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    // Comments with author names. Uses the service client because the
    // users table is locked to self/admin reads — this join needs to see
    // other commenters' display names, which is safe here since only
    // full_name/email are selected and the page never exposes raw email.
    createServiceClient()
      .from('content_comments')
      .select('id, body, is_deleted, created_at, user:users!content_comments_user_id_fkey(full_name, email)')
      .eq('content_id', rawItem.id)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true }),

    // User's existing rating
    user
      ? supabase
          .from('ratings')
          .select('rating, review_text')
          .eq('content_id', rawItem.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    // Cached AI summary
    user
      ? supabase
          .from('ai_summaries')
          .select('summary_text, bullet_points, key_concepts')
          .eq('content_id', rawItem.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    // Mark-as-complete state (drives Series page checkmarks)
    user
      ? supabase
          .from('content_progress')
          .select('status')
          .eq('content_id', rawItem.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    // Continue From Here (E.7) — Layer 1 metadata lookup, no AI call.
    retrieveContinueFromHere(supabase, {
      contentId: rawItem.id,
      domain: (item.domain as string | null) ?? null,
      tags: (item.tags as string[] | null) ?? [],
      seriesId: (item.series_id as string | null) ?? null,
    }),
  ])

  // Record view. This must be awaited: an unawaited insert is routinely
  // killed when the serverless function returns its response, which is why
  // article views were almost never persisted while ebook and template
  // views (which already await) recorded fine. That gap is what made the
  // dashboard and admin analytics under-report reading activity.
  // Anonymous views are recorded with a null user_id, matching how
  // /content/[slug] already behaves.
  try {
    const svc = createServiceClient()
    await svc.from('content_interactions').insert({
      content_id: rawItem.id,
      user_id: user?.id ?? null,
      type: 'view',
      metadata: {},
    } as never)
  } catch { /* non-fatal — never block the article render on telemetry */ }

  const hasUpvoted = !!upvoteResult.data
  const hasFavorited = !!favoriteResult.data
  const hasCompleted = (progressResult.data as { status?: string } | null)?.status === 'completed'
  const comments = ((commentResult.data ?? []) as unknown[]) as Array<{
    id: string
    body: string
    is_deleted: boolean
    created_at: string
    user: { full_name: string | null; email: string } | null
  }>

  const existingRating = ratingResult.data
  const cachedSummary = summaryResult.data
    ? {
        summary: summaryResult.data.summary_text,
        bullets: (summaryResult.data.bullet_points as unknown as string[]) ?? [],
        concepts: (summaryResult.data.key_concepts as unknown as string[]) ?? [],
      }
    : null

  const publishedDate = rawItem.published_at
    ? new Date(rawItem.published_at as string).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })
    : null
  const updatedDate = rawItem.updated_at
    ? new Date(rawItem.updated_at as string).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })
    : null
  const showUpdatedDate = updatedDate && updatedDate !== publishedDate

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-paper-base)' }}>
      <JsonLd data={articleSchema({
        headline: rawItem.title as string,
        description: rawItem.summary as string | null,
        image: rawItem.cover_image_url as string | null,
        path: `/articles/${slug}`,
        datePublished: rawItem.published_at as string | null,
        dateModified: rawItem.updated_at as string | null,
      })} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Articles', path: '/articles' },
        { name: rawItem.title as string, path: `/articles/${slug}` },
      ])} />
      {/* Sticky nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'color-mix(in srgb, var(--color-paper-base) 92%, transparent)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
        padding: '0.875rem var(--spacing-margin-edge)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/articles" className="text-label-sm" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          ← Articles
        </Link>
        <Link href="/" className="text-label-sm" style={{ color: 'var(--color-ink-deep)', fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--font-serif)' }}>
          Product Slice HQ
        </Link>
      </nav>

      <main style={{ maxWidth: '44rem', margin: '0 auto', padding: '3rem var(--spacing-margin-edge) 5rem' }}>
        <article>
          <header style={{ marginBottom: '2rem' }}>
            {rawItem.cover_image_url && (
              <img
                src={rawItem.cover_image_url as string}
                alt={rawItem.title as string}
                width={1200}
                height={420}
                style={{ width: '100%', borderRadius: '0.25rem', marginBottom: '2rem', height: '420px', objectFit: 'cover' }}
              />
            )}

            {rawItem.tags && Array.isArray(rawItem.tags) && (rawItem.tags as string[]).length > 0 && (
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {(rawItem.tags as string[]).map(tag => (
                  <span key={tag} className="text-label-sm" style={{
                    background: 'var(--color-paper-darker)',
                    color: 'var(--color-text-muted)',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '0.125rem',
                    border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', margin: '0 0 1rem' }}>
              {rawItem.title as string}
            </h1>

            {rawItem.summary && (
              <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, margin: '0 0 1.25rem' }}>
                {rawItem.summary as string}
              </p>
            )}

            <div className="text-label-sm" style={{
              display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
              color: 'var(--color-text-muted)',
              paddingBottom: '1.25rem',
              borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
            }}>
              <span>By {AUTHOR.name}</span>
              {publishedDate && <span>{publishedDate}</span>}
              {showUpdatedDate && <span>Updated {updatedDate}</span>}
              <UpvoteButton
                contentId={rawItem.id}
                initialCount={rawItem.upvote_count as number ?? 0}
                initialUpvoted={hasUpvoted}
                isLoggedIn={!!user}
              />
              <ShareButton
                contentId={rawItem.id}
                title={rawItem.title as string}
                url={absoluteUrl(`/articles/${slug}`)}
                variant="inline"
              />
              <FavoriteButton
                contentId={rawItem.id}
                initialFavorited={hasFavorited}
                isLoggedIn={!!user}
              />
              <MarkCompleteButton
                contentId={rawItem.id}
                initialComplete={hasCompleted}
                isLoggedIn={!!user}
              />
              <AutoCompleteTracker
                contentId={rawItem.id}
                isLoggedIn={!!user}
                alreadyComplete={hasCompleted}
              />
            </div>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: rawItem.body ? '1fr 1fr' : '1fr', gap: '0.625rem', marginBottom: '1.5rem' }}>
            <AiSummaryPanel
              contentId={rawItem.id}
              isLoggedIn={!!user}
              cachedSummary={cachedSummary}
            />
            {rawItem.body ? <ListenButton text={rawItem.body as string} contentId={rawItem.id} /> : null}
          </div>

          {rawItem.body ? (
            <div style={{ marginBottom: '3rem' }}>
              {renderBody(rawItem.body as string)}
            </div>
          ) : (
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: '3rem' }}>No content yet.</p>
          )}

          <ExercisesSection contentId={rawItem.id} isLoggedIn={!!user} />

          <div style={{
            marginBottom: '2.5rem',
            padding: '1.5rem',
            background: 'var(--color-paper-darker)',
            borderRadius: '0.5rem',
            border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
          }}>
            <h2 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: '0 0 1rem' }}>
              Rate this article
            </h2>
            <RatingWidget
              contentId={rawItem.id}
              isLoggedIn={!!user}
              existingRating={existingRating?.rating ?? null}
              existingReview={existingRating?.review_text ?? null}
            />
          </div>

          <CommentsSection
            contentId={rawItem.id}
            comments={comments}
            isLoggedIn={!!user}
          />

          <ContinueFromHereSection items={continueFromHere} fromContentId={rawItem.id} />
        </article>
      </main>
    </div>
  )
}
