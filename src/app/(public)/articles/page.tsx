import { createClient } from '@/lib/supabase/server'
import { ContentCard } from '@/components/content/ContentCard'

export default async function ArticlesPage() {
  const supabase = await createClient()
  const { data: rawItems } = await supabase
    .from('content')
    .select('id,title,slug,type,summary,cover_image_url,tags,view_count,upvote_count,comment_count,published_at')
    .eq('status', 'published')
    .eq('type', 'article')
    .order('published_at', { ascending: false })

  const items = (rawItems ?? []).map(item => ({
    ...item,
    pricing_type: 'free',
    price_amount: null,
    currency: 'NGN',
  }))

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#111827' }}>Articles</h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Insights, frameworks, and stories from the African PM community.
        </p>
      </header>

      {items.length === 0 ? (
        <p style={{ color: '#9ca3af' }}>No articles yet. Check back soon.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {items.map(item => <ContentCard key={item.id} {...item} />)}
        </div>
      )}
    </div>
  )
}
