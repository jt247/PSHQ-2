import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@pshq/api-client/server'

interface Props { params: Promise<{ id: string }> }

async function getContentAnalytics(id: string) {
  const service = createServiceClient()

  const { data: content } = await service
    .from('content')
    .select('id, title, slug, type, status, summary, view_count, upvote_count, comment_count, published_at, created_at, featured, domain, level')
    .eq('id', id)
    .maybeSingle()

  if (!content) return null

  const [
    ratingsResult,
    interactionsResult,
    favoritesResult,
    exercisesResult,
    contentProgressResult,
  ] = await Promise.all([
    service.from('ratings').select('rating').eq('content_id', id),
    service.from('content_interactions').select('type').eq('content_id', id),
    service.from('content_favorites').select('id', { count: 'exact', head: true }).eq('content_id', id),
    service.from('exercises').select('id').eq('content_id', id),
    service.from('content_progress').select('id', { count: 'exact', head: true }).eq('content_id', id).eq('status', 'completed'),
  ])

  const exerciseIds = exercisesResult.data?.map(e => e.id) ?? []
  const exerciseResponsesResult = exerciseIds.length > 0
    ? await service.from('exercise_responses').select('id', { count: 'exact', head: true }).in('exercise_id', exerciseIds)
    : { count: 0 }

  const ratings = ratingsResult.data ?? []
  const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10 : null

  const interactionCounts: Record<string, number> = {}
  for (const row of interactionsResult.data ?? []) {
    interactionCounts[row.type] = (interactionCounts[row.type] ?? 0) + 1
  }

  return {
    content,
    avgRating,
    ratingCount: ratings.length,
    favoriteCount: favoritesResult.count ?? 0,
    completedCount: contentProgressResult.count ?? 0,
    exerciseCount: exercisesResult.data?.length ?? 0,
    exerciseResponseCount: exerciseResponsesResult.count ?? 0,
    interactionCounts,
  }
}

export default async function ContentAnalyticsPage({ params }: Props) {
  const { id } = await params
  const data = await getContentAnalytics(id)
  if (!data) notFound()

  const { content, avgRating, ratingCount, favoriteCount, completedCount, exerciseCount, exerciseResponseCount, interactionCounts } = data

  return (
    <div style={{ maxWidth: '56rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <Link href="/content" className="action-btn" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>← All content</Link>
          <h1 style={{ margin: '0.5rem 0 0.25rem' }}>{content.title}</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
            /{content.slug} · {content.type} · {content.status}
            {content.domain && ` · ${content.domain}`}
            {content.level && ` · ${content.level}`}
          </p>
        </div>
        <Link href={`/content/${id}/edit`} className="btn-primary">Edit this resource →</Link>
      </div>

      {content.summary && <p style={{ color: '#374151', marginBottom: '2rem', maxWidth: '48rem' }}>{content.summary}</p>}

      <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Analytics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Stat label="Views" value={content.view_count} />
        <Stat label="Upvotes" value={content.upvote_count} />
        <Stat label="Comments" value={content.comment_count} />
        <Stat label="Favorites" value={favoriteCount} />
        <Stat label="Completions" value={completedCount} />
        <Stat label="Avg Rating" value={avgRating != null ? `${avgRating} / 5` : '—'} />
        <Stat label="Ratings" value={ratingCount} />
        <Stat label="Downloads" value={interactionCounts.download ?? 0} />
        <Stat label="Shares" value={interactionCounts.share ?? 0} />
        <Stat label="Reads" value={interactionCounts.read ?? 0} />
        <Stat label="Listens" value={interactionCounts.listen ?? 0} />
        <Stat label="AI Summaries" value={interactionCounts.ai_summary_requested ?? 0} />
      </div>

      {exerciseCount > 0 && (
        <>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Exercises</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <Stat label="Exercises Attached" value={exerciseCount} />
            <Stat label="Responses Saved" value={exerciseResponseCount} />
          </div>
        </>
      )}

      <p style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>
        Published {content.published_at ? new Date(content.published_at).toLocaleDateString() : '—'} · Created {new Date(content.created_at).toLocaleDateString()} · {content.featured ? 'Featured on home page' : 'Not featured'}
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: '#fff' }}>
      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{value}</p>
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#6b7280' }}>{label}</p>
    </div>
  )
}
