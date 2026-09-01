import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@pshq/api-client/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

export const metadata: Metadata = {
  title: 'Collections — Curated Resource Bundles',
  description: 'Curated bundles of Product Slice HQ resources for a specific goal — GTM, AI building, and PM interview prep.',
  alternates: { canonical: '/collections' },
}

interface Collection {
  id: string
  slug: string
  title: string
  description: string | null
  item_count: number
}

async function getCollections(): Promise<Collection[]> {
  const service = createServiceClient()
  const { data } = await service
    .from('collections')
    .select('id, slug, title, description, display_order, collection_items(count)')
    .eq('status', 'published')
    .order('display_order')

  return (data ?? []).map(row => ({
    id: row.id, slug: row.slug, title: row.title, description: row.description,
    item_count: (row.collection_items as unknown as { count: number }[])?.[0]?.count ?? 0,
  }))
}

export default async function CollectionsPage() {
  const collections = await getCollections()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/collections" />

      <main style={{ flex: 1, maxWidth: '64rem', margin: '0 auto', width: '100%', padding: '5rem var(--spacing-margin-edge)' }}>
        <section style={{ maxWidth: '48ch', marginBottom: '3rem' }}>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.875rem' }}>Collections</h1>
          <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
            Curated bundles of resources, grouped around a specific goal — no fixed order required.
          </p>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
          {collections.map(c => (
            <Link key={c.id} href={`/collections/${c.slug}`} style={{
              display: 'block', textDecoration: 'none', padding: '1.5rem',
              border: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)',
              borderRadius: '0.5rem',
            }}>
              <span className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-ink-deep)', marginBottom: '0.75rem', display: 'inline-block' }}>{c.item_count} resources</span>
              <p className="text-body-lg" style={{ fontWeight: 700, color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>{c.title}</p>
              {c.description && <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>{c.description}</p>}
            </Link>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
