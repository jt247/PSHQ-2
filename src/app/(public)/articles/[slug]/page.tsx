import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { UpvoteButton } from '@/components/article/UpvoteButton'
import { AiSummaryPanel } from '@/components/article/AiSummaryPanel'
import { CommentsSection } from '@/components/article/CommentsSection'
import { RatingWidget } from '@/components/article/RatingWidget'

interface Props { params: Promise<{ slug: string }> }

function renderBody(text: string) {
  return text.split(/\n\n+/).map((block, i) => {
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
  const [upvoteResult, commentResult, ratingResult, summaryResult] = await Promise.all([
    // Whether user has upvoted
    user
      ? supabase
          .from('content_upvotes')
          .select('id')
          .eq('content_id', rawItem.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    // Comments with author names
    supabase
      .from('content_comments')
      .select('id, body, is_deleted, created_at, user:users(full_name, email)')
      .eq('content_id', rawItem.id)
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
  ])

  // Record view (fire-and-forget)
  if (user) {
    const svc = createServiceClient()
    svc.from('content_interactions').insert({
      content_id: rawItem.id,
      user_id: user.id,
      type: 'view',
      metadata: {},
    } as never).then(() => null, () => null)
  }

  const hasUpvoted = !!upvoteResult.data
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-paper-base)' }}>
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
                style={{ width: '100%', borderRadius: '0.25rem', marginBottom: '2rem', maxHeight: '420px', objectFit: 'cover' }}
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
              {publishedDate && <span>{publishedDate}</span>}
              <span>{(item.view_count as number ?? 0).toLocaleString()} views</span>
              <UpvoteButton
                contentId={rawItem.id}
                initialCount={rawItem.upvote_count as number ?? 0}
                initialUpvoted={hasUpvoted}
                isLoggedIn={!!user}
              />
            </div>
          </header>

          <AiSummaryPanel
            contentId={rawItem.id}
            isLoggedIn={!!user}
            cachedSummary={cachedSummary}
          />

          {rawItem.body ? (
            <div style={{ marginBottom: '3rem' }}>
              {renderBody(rawItem.body as string)}
            </div>
          ) : (
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: '3rem' }}>No content yet.</p>
          )}

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
        </article>
      </main>
    </div>
  )
}
