import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@pshq/api-client/server'
import { ContentCard } from '@/components/content/ContentCard'
import { LibrarySearch } from '@/components/content/LibrarySearch'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

// Canonical always points to the unfiltered base URL — type/pricing filter
// states are the same underlying content, just re-sorted, so they should
// never be treated as separate pages for indexing purposes.
export const metadata: Metadata = {
  title: 'Free PM Resources, Ebooks & Templates',
  description:
    'Browse free product management ebooks, templates, and articles. Practical resources for product managers, designers, and founders — no paywall, no signup wall for browsing.',
  alternates: { canonical: '/library' },
}

interface SearchParams { type?: string; pricing?: string; search?: string; sort?: string }
interface Props { searchParams: Promise<SearchParams> }

const TYPE_OPTIONS = ['all', 'article', 'ebook', 'template', 'course'] as const
const PRICING_OPTIONS = ['all', 'free', 'paid'] as const
const SORT_OPTIONS = ['newest', 'oldest'] as const
const TYPE_LABELS: Record<string, string> = { all: 'All', article: 'Articles', ebook: 'E-books', template: 'Templates', course: 'Courses' }
const SORT_LABELS: Record<string, string> = { newest: 'Newest first', oldest: 'Oldest first' }

export default async function LibraryPage({ searchParams }: Props) {
  const { type = 'all', pricing = 'all', search = '', sort = 'newest' } = await searchParams
  const sortOrder = sort === 'oldest' ? 'oldest' : 'newest'
  const supabase = await createClient()

  let query = supabase
    .from('content')
    .select('id,title,slug,type,summary,cover_image_url,tags,pricing_type,selar_url,view_count,upvote_count,comment_count,published_at,is_coming_soon')
    .eq('status', 'published')
    .order('published_at', { ascending: sortOrder === 'oldest' })

  if (type && type !== 'all') query = query.eq('type', type)

  const { data: rawItems } = await query
  const items = (rawItems ?? []).map(item => ({
    ...item,
    pricing_type: (item as Record<string, unknown>).pricing_type as string ?? 'free',
    selar_url: (item as Record<string, unknown>).selar_url as string | null ?? null,
    is_coming_soon: (item as Record<string, unknown>).is_coming_soon as boolean ?? false,
  }))

  const byPricing = pricing === 'all' ? items : items.filter(i => i.pricing_type === pricing)

  const searchTerm = search.trim().toLowerCase()
  const filtered = !searchTerm ? byPricing : byPricing.filter(i => {
    const haystack = [i.title, i.summary ?? '', ...(i.tags ?? [])].join(' ').toLowerCase()
    return haystack.includes(searchTerm)
  })

  // Every filter link needs to preserve the other three params — this was
  // already a source of one real bug (switching type/pricing used to
  // silently drop an active search term). One builder for all of them
  // instead of hand-concatenating the string four times.
  function buildUrl(overrides: Partial<{ type: string; pricing: string; sort: string }>) {
    const params = new URLSearchParams()
    params.set('type', overrides.type ?? type)
    params.set('pricing', overrides.pricing ?? pricing)
    const nextSort = overrides.sort ?? sortOrder
    if (nextSort !== 'newest') params.set('sort', nextSort)
    if (search) params.set('search', search)
    return `/library?${params.toString()}`
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/library" />

      <main style={{ flex: 1, maxWidth: '80rem', margin: '0 auto', width: '100%', padding: '5rem var(--spacing-margin-edge)' }}>
        {/* Header */}
        <section style={{ maxWidth: '42ch', marginBottom: '3rem' }}>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.875rem' }}>Library</h1>
          <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
            A curated collection of resources for the thoughtful creator. From deep-dive articles to interactive courses, designed to help you synthesize ideas and cultivate professional mastery.
          </p>
        </section>

        {/* Search */}
        <section style={{ marginBottom: '1.5rem' }}>
          <Suspense fallback={<div style={{ maxWidth: '28rem', height: '44px', borderRadius: '0.25rem', background: 'var(--color-paper-darker)' }} />}>
            <LibrarySearch initialValue={search} />
          </Suspense>
        </section>

        {/* Filters */}
        <section style={{ borderTop: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)', borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)', padding: '1.25rem 0', marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Type filters */}
          <div>
            <p className="text-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: '0.5rem', opacity: 0.6 }}>
              Content Type
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {TYPE_OPTIONS.map(t => (
                <a key={t} href={buildUrl({ type: t })} className="text-label-sm" style={{
                  padding: '0.375rem 1rem',
                  borderRadius: '0.125rem',
                  background: type === t ? 'var(--color-ink-deep)' : 'var(--color-paper-darker)',
                  color: type === t ? '#ffffff' : 'var(--color-ink-deep)',
                  border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
                  textDecoration: 'none',
                  transition: 'all 150ms',
                }}>
                  {TYPE_LABELS[t] ?? t}
                </a>
              ))}
            </div>
          </div>

          {/* Pricing filters */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {PRICING_OPTIONS.map(p => (
                <a key={p} href={buildUrl({ pricing: p })} className="text-label-sm" style={{
                  padding: '0.375rem 1rem',
                  borderRadius: '0.125rem',
                  background: pricing === p ? 'var(--color-ink-deep)' : 'transparent',
                  color: pricing === p ? '#ffffff' : 'var(--color-text-muted)',
                  border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
                  textDecoration: 'none',
                  transition: 'all 150ms',
                  textTransform: 'capitalize',
                }}>
                  {p === 'all' ? 'All pricing' : p}
                </a>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span className="text-label-sm" style={{ color: 'var(--color-text-muted)' }}>
                {filtered.length} {filtered.length === 1 ? 'resource' : 'resources'}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {SORT_OPTIONS.map(s => (
                  <a key={s} href={buildUrl({ sort: s })} className="text-label-sm" style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.125rem',
                    background: sortOrder === s ? 'var(--color-ink-deep)' : 'transparent',
                    color: sortOrder === s ? '#ffffff' : 'var(--color-text-muted)',
                    border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
                    textDecoration: 'none',
                    transition: 'all 150ms',
                  }}>
                    {SORT_LABELS[s]}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <p className="text-headline-md" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>No resources found</p>
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)' }}>
              {searchTerm ? `Nothing matches "${search}". Try a different keyword or filter.` : 'Try a different filter'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
            {filtered.map(item => <ContentCard key={item.id} {...item} />)}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
