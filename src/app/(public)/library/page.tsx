import { createClient } from '@/lib/supabase/server'
import { ContentCard } from '@/components/content/ContentCard'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

interface SearchParams { type?: string; pricing?: string }
interface Props { searchParams: Promise<SearchParams> }

const TYPE_OPTIONS = ['all', 'article', 'ebook', 'template', 'course'] as const
const PRICING_OPTIONS = ['all', 'free', 'paid'] as const
const TYPE_LABELS: Record<string, string> = { all: 'All', article: 'Articles', ebook: 'E-books', template: 'Templates', course: 'Courses' }

export default async function LibraryPage({ searchParams }: Props) {
  const { type = 'all', pricing = 'all' } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('content')
    .select('id,title,slug,type,summary,cover_image_url,tags,view_count,upvote_count,comment_count,published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (type && type !== 'all') query = query.eq('type', type)

  const { data: rawItems } = await query
  const items = (rawItems ?? []).map(item => ({
    ...item,
    pricing_type: (item as Record<string, unknown>).pricing_type as string ?? 'free',
    price_amount: (item as Record<string, unknown>).price_amount as number | null ?? null,
    currency: (item as Record<string, unknown>).currency as string ?? 'NGN',
  }))

  const filtered = pricing === 'all' ? items : items.filter(i => i.pricing_type === pricing)

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

        {/* Filters */}
        <section style={{ borderTop: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)', borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)', padding: '1.25rem 0', marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Type filters */}
          <div>
            <p className="text-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: '0.5rem', opacity: 0.6 }}>
              Content Type
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {TYPE_OPTIONS.map(t => (
                <a key={t} href={`/library?type=${t}&pricing=${pricing}`} className="text-label-sm" style={{
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
                <a key={p} href={`/library?type=${type}&pricing=${p}`} className="text-label-sm" style={{
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
            <span className="text-label-sm" style={{ color: 'var(--color-text-muted)' }}>
              {filtered.length} {filtered.length === 1 ? 'resource' : 'resources'}
            </span>
          </div>
        </section>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <p className="text-headline-md" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>No resources found</p>
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)' }}>Try a different filter</p>
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
