import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@pshq/api-client/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

interface SeriesItem {
  sequence: number
  content: { id: string; title: string; slug: string; type: string; summary: string | null }
}

function itemHref(content: SeriesItem['content']): string {
  return content.type === 'article' ? `/articles/${content.slug}` : content.type === 'build_note' ? `/build-notes/${content.slug}` : `/content/${content.slug}`
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('series').select('title, description').eq('slug', slug).eq('status', 'published').maybeSingle()
  if (!data) return { title: 'Series not found' }
  return { title: `${data.title} — Series`, description: data.description ?? undefined, alternates: { canonical: `/series/${slug}` } }
}

export default async function SeriesDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: series } = await supabase
    .from('series')
    .select('id, slug, title, description, series_items (sequence, content:content_id (id, title, slug, type, summary))')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!series) notFound()

  const items = ((series.series_items ?? []) as unknown as SeriesItem[]).slice().sort((a, b) => a.sequence - b.sequence)

  const { data: { user } } = await supabase.auth.getUser()
  let completedIds = new Set<string>()
  if (user && items.length > 0) {
    const { data: progress } = await supabase
      .from('content_progress')
      .select('content_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .in('content_id', items.map(i => i.content.id))
    completedIds = new Set((progress ?? []).map(p => p.content_id))
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/library" />

      <main style={{ flex: 1, maxWidth: '42rem', margin: '0 auto', width: '100%', padding: '4rem var(--spacing-margin-edge) 6rem' }}>
        <Link href="/library" className="text-label-sm" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>← Library</Link>

        <header style={{ margin: '1.5rem 0 2.5rem' }}>
          <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Series</p>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.75rem' }}>{series.title}</h1>
          {series.description && <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>{series.description}</p>}
          {user && items.length > 0 && (
            <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', marginTop: '1rem' }}>
              {completedIds.size}/{items.length} completed
            </p>
          )}
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map(item => (
            <Link key={item.content.id} href={itemHref(item.content)} style={{
              display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none',
              padding: '1.25rem', border: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)',
              borderRadius: '0.5rem',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: completedIds.has(item.content.id) ? '#15803d' : 'var(--color-paper-darker)',
                color: completedIds.has(item.content.id) ? '#fff' : 'var(--color-text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700,
              }}>
                {completedIds.has(item.content.id) ? '✓' : item.sequence}
              </div>
              <div>
                <p className="text-body-md" style={{ fontWeight: 600, color: 'var(--color-ink-deep)', margin: 0 }}>{item.content.title}</p>
                {item.content.summary && <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>{item.content.summary}</p>}
              </div>
            </Link>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
