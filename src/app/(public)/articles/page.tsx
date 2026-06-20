import { createClient } from '@/lib/supabase/server'
import { ContentCard } from '@/components/content/ContentCard'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/articles" />

      <main style={{ flex: 1, maxWidth: '80rem', margin: '0 auto', width: '100%', padding: '5rem var(--spacing-margin-edge)' }}>
        <section style={{ maxWidth: '42ch', marginBottom: '3rem' }}>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.875rem' }}>Articles</h1>
          <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
            Insights, frameworks, and stories for the product-minded professional. Written to sharpen thinking and move practice forward.
          </p>
        </section>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <p className="text-headline-md" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>No articles yet</p>
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)' }}>Check back soon.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
            {items.map(item => <ContentCard key={item.id} {...item} />)}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
