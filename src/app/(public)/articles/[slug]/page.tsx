import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

  // get current user (may be null for anonymous)
  const { data: { user } } = await supabase.auth.getUser()

  // record view (fire-and-forget, use service role to bypass RLS)
  try {
    const service = await createServiceClient()
    await service.from('content_interactions').insert({
      content_id: rawItem.id,
      user_id: user?.id ?? null,
      interaction_type: 'view',
      metadata: {},
    })
    await service.rpc('increment_view_count', { content_id: rawItem.id }).then(() => null, () => null)
  } catch {
    // non-fatal
  }

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
        <header style={{ marginBottom: '2rem' }}>
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
            <p style={{ fontSize: '1.0625rem', color: '#6b7280', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
              {rawItem.summary as string}
            </p>
          )}

          <div style={{ fontSize: '0.8125rem', color: '#9ca3af', display: 'flex', gap: '1rem' }}>
            {publishedDate && <span>{publishedDate}</span>}
            <span>{(item.view_count as number ?? 0).toLocaleString()} views</span>
            <span>{(item.upvote_count as number ?? 0)} upvotes</span>
          </div>
        </header>

        {rawItem.body ? (
          <div style={{
            lineHeight: 1.8,
            fontSize: '1.0625rem',
            color: '#374151',
            whiteSpace: 'pre-wrap',
          }}>
            {rawItem.body as string}
          </div>
        ) : (
          <p style={{ color: '#9ca3af' }}>No content yet.</p>
        )}
      </article>
    </div>
  )
}
