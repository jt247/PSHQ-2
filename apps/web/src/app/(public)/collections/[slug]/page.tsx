import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { trackContentOpened } from '@pshq/analytics'
import { ContentCard } from '@/components/content/ContentCard'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { SaveButton } from './SaveButton'

interface Item {
  display_order: number
  content: {
    id: string; title: string; slug: string; type: string; summary: string | null
    cover_image_url: string | null; pricing_type: string; view_count: number
    upvote_count: number; tags: string[]; published_at: string | null
  }
}

interface CollectionDetail {
  id: string
  slug: string
  title: string
  description: string | null
  collection_items: Item[]
}

async function getCollection(slug: string): Promise<CollectionDetail | null> {
  const service = createServiceClient()
  const { data } = await service
    .from('collections')
    .select(`
      id, slug, title, description,
      collection_items (display_order, content:content_id (id, title, slug, type, summary, cover_image_url, pricing_type, view_count, upvote_count, tags, published_at))
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!data) return null
  const items = ((data.collection_items ?? []) as unknown as Item[]).slice().sort((a, b) => a.display_order - b.display_order)
  return { ...(data as Omit<CollectionDetail, 'collection_items'>), collection_items: items }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const item = await getCollection(slug)
  if (!item) return { title: 'Collection not found' }
  return { title: `${item.title} — Collections`, description: item.description ?? undefined, alternates: { canonical: `/collections/${item.slug}` } }
}

export default async function CollectionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const collection = await getCollection(slug)
  if (!collection) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isSaved = false
  if (user) {
    const { data } = await supabase.from('collection_favorites').select('id').eq('user_id', user.id).eq('collection_id', collection.id).maybeSingle()
    isSaved = !!data
  }
  await trackContentOpened({ supabase, source: 'web', userId: user?.id ?? null }, { contentId: collection.id, contentType: 'article' })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/collections" />

      <main style={{ flex: 1, maxWidth: '64rem', margin: '0 auto', width: '100%', padding: '4rem var(--spacing-margin-edge) 6rem' }}>
        <Link href="/collections" className="text-label-sm" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>← All collections</Link>

        <header style={{ margin: '1.5rem 0 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ maxWidth: '42ch' }}>
            <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.75rem' }}>{collection.title}</h1>
            {collection.description && <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>{collection.description}</p>}
          </div>
          <SaveButton collectionId={collection.id} slug={collection.slug} isSaved={isSaved} isSignedIn={!!user} />
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
          {collection.collection_items.map(item => item.content && <ContentCard key={item.content.id} {...item.content} />)}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
