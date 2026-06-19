import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { UpvoteButton } from '@/components/article/UpvoteButton'
import { AiSummaryPanel } from '@/components/article/AiSummaryPanel'
import { CommentsSection } from '@/components/article/CommentsSection'
import { RatingWidget } from '@/components/article/RatingWidget'

interface Props { params: Promise<{ slug: string }> }

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
    createServiceClient().then(svc =>
      svc.from('content_interactions').insert({
        content_id: rawItem.id,
        user_id: user.id,
        interaction_type: 'view',
        metadata: {},
      } as never)
    ).catch(() => null)
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
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <nav style={{ marginBottom: '1.5rem' }}>
        <Link href="/articles" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← Back to articles
        </Link>
      </nav>

      <article>
        <header style={{ marginBottom: '1.5rem' }}>
          {rawItem.cover_image_url && (
            <img
              src={rawItem.cover_image_url as string}
              alt={rawItem.title as string}
              style={{ width: '100%', borderRadius: '10px', marginBottom: '1.5rem', maxHeight: '400px', objectFit: 'cover' }}
            />
          )}

          {rawItem.tags && Array.isArray(rawItem.tags) && (rawItem.tags as string[]).length > 0 && (
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {(rawItem.tags as string[]).map(tag => (
                <span key={tag} style={{
                  background: '#f3f4f6', color: '#6b7280',
                  fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '4px',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 700, lineHeight: 1.3, color: '#111827', margin: '0 0 0.75rem' }}>
            {rawItem.title as string}
          </h1>

          {rawItem.summary && (
            <p style={{ fontSize: '1.0625rem', color: '#6b7280', lineHeight: 1.6, margin: '0 0 0.875rem' }}>
              {rawItem.summary as string}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {publishedDate && <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>{publishedDate}</span>}
            <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>{(item.view_count as number ?? 0).toLocaleString()} views</span>

            {/* Upvote button */}
            <UpvoteButton
              contentId={rawItem.id}
              initialCount={rawItem.upvote_count as number ?? 0}
              initialUpvoted={hasUpvoted}
              isLoggedIn={!!user}
            />
          </div>
        </header>

        {/* AI Summary */}
        <AiSummaryPanel
          contentId={rawItem.id}
          isLoggedIn={!!user}
          cachedSummary={cachedSummary}
        />

        {/* Article body */}
        {rawItem.body ? (
          <div style={{
            lineHeight: 1.8,
            fontSize: '1.0625rem',
            color: '#374151',
            whiteSpace: 'pre-wrap',
            marginBottom: '2.5rem',
          }}>
            {rawItem.body as string}
          </div>
        ) : (
          <p style={{ color: '#9ca3af', marginBottom: '2.5rem' }}>No content yet.</p>
        )}

        {/* Rating */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: '0 0 0.75rem' }}>
            Rate this article
          </h2>
          <RatingWidget
            contentId={rawItem.id}
            isLoggedIn={!!user}
            existingRating={existingRating?.rating ?? null}
            existingReview={existingRating?.review_text ?? null}
          />
        </div>

        {/* Comments */}
        <CommentsSection
          contentId={rawItem.id}
          comments={comments}
          isLoggedIn={!!user}
        />
      </article>
    </div>
  )
}
