import { createClient } from '@/lib/supabase/server'
import { ContentCard } from '@/components/content/ContentCard'

interface SearchParams {
  type?: string
  pricing?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

const TYPE_OPTIONS = ['all', 'article', 'ebook', 'template', 'course'] as const
const PRICING_OPTIONS = ['all', 'free', 'paid'] as const

export default async function LibraryPage({ searchParams }: Props) {
  const { type = 'all', pricing = 'all' } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('content')
    .select('id,title,slug,type,summary,cover_image_url,tags,view_count,upvote_count,comment_count,published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (type && type !== 'all') {
    query = query.eq('type', type)
  }

  const { data: rawItems } = await query

  const items = (rawItems ?? []).map(item => ({
    ...item,
    pricing_type: (item as Record<string, unknown>).pricing_type as string ?? 'free',
    price_amount: (item as Record<string, unknown>).price_amount as number | null ?? null,
    currency: (item as Record<string, unknown>).currency as string ?? 'NGN',
  }))

  const filtered = pricing === 'all'
    ? items
    : items.filter(i => i.pricing_type === pricing)

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#111827' }}>
          Resource Library
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Templates, ebooks, articles, and courses for African product managers.
        </p>
      </header>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          {TYPE_OPTIONS.map(t => (
            <a
              key={t}
              href={`/library?type=${t}&pricing=${pricing}`}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.8125rem',
                fontWeight: 500,
                background: type === t ? '#111827' : '#fff',
                color: type === t ? '#fff' : '#374151',
                textDecoration: 'none',
                textTransform: 'capitalize',
                borderRight: '1px solid #e5e7eb',
                display: 'inline-block',
              }}
            >
              {t === 'all' ? 'All types' : t}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          {PRICING_OPTIONS.map(p => (
            <a
              key={p}
              href={`/library?type=${type}&pricing=${p}`}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.8125rem',
                fontWeight: 500,
                background: pricing === p ? '#111827' : '#fff',
                color: pricing === p ? '#fff' : '#374151',
                textDecoration: 'none',
                textTransform: 'capitalize',
                borderRight: '1px solid #e5e7eb',
                display: 'inline-block',
              }}
            >
              {p === 'all' ? 'All pricing' : p}
            </a>
          ))}
        </div>

        <span style={{ fontSize: '0.8125rem', color: '#9ca3af', alignSelf: 'center', marginLeft: 'auto' }}>
          {filtered.length} {filtered.length === 1 ? 'resource' : 'resources'}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#9ca3af' }}>
          <p style={{ fontSize: '1.125rem', margin: '0 0 0.5rem' }}>No resources found</p>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Try a different filter</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}>
          {filtered.map(item => (
            <ContentCard key={item.id} {...item} />
          ))}
        </div>
      )}
    </div>
  )
}
