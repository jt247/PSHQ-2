import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface SearchParams { tab?: string; type?: string }
interface Props { searchParams: Promise<SearchParams> }

const TABS = ['all', 'favorites'] as const
const TYPE_OPTIONS = ['all', 'article', 'ebook', 'template', 'course'] as const
const TYPE_LABELS: Record<string, string> = { all: 'All', article: 'Articles', ebook: 'E-books', template: 'Templates', course: 'Courses' }
const TAB_LABELS: Record<string, string> = { all: 'All Interacted', favorites: 'Favorites' }
const HREF_BY_TYPE: Record<string, (slug: string) => string> = {
  article: slug => `/articles/${slug}`,
  ebook: slug => `/content/${slug}`,
  template: slug => `/content/${slug}`,
  course: slug => `/content/${slug}`,
}

type ContentRef = {
  id: string
  title: string
  slug: string
  type: string
  summary: string | null
  cover_image_url: string | null
  tags: string[]
}

export default async function MyLibraryPage({ searchParams }: Props) {
  const { tab: tabParam, type: typeParam } = await searchParams
  const tab = TABS.includes(tabParam as typeof TABS[number]) ? tabParam! : 'all'
  const type = TYPE_OPTIONS.includes(typeParam as typeof TYPE_OPTIONS[number]) ? typeParam! : 'all'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  let items: ContentRef[] = []

  if (tab === 'favorites') {
    const { data } = await supabase
      .from('content_favorites')
      .select('content_id, created_at, content:content(id, title, slug, type, summary, cover_image_url, tags)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    items = ((data ?? []) as unknown as Array<{ content: ContentRef | null }>)
      .map(row => row.content)
      .filter((c): c is ContentRef => c != null)
  } else {
    // Everything the user has actually opened or downloaded. There is no
    // 'unlock' interaction type — nothing in the app has ever written one —
    // so querying it left this page permanently empty of ebooks and
    // templates. 'view' and 'download' are the only types written that
    // matter here.
    const { data } = await supabase
      .from('content_interactions')
      .select('content_id, created_at, content:content(id, title, slug, type, summary, cover_image_url, tags)')
      .eq('user_id', user.id)
      .in('type', ['view', 'download'])
      .order('created_at', { ascending: false })

    const seenIds = new Set<string>()
    for (const row of ((data ?? []) as unknown as Array<{ content: ContentRef | null }>)) {
      const c = row.content
      if (c && c.id && !seenIds.has(c.id)) {
        seenIds.add(c.id)
        items.push(c)
      }
    }
  }

  const filtered = type === 'all' ? items : items.filter(i => i.type === type)

  return (
    <div className="dash-content">
      <section style={{ marginBottom: '1.5rem' }}>
        <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.375rem' }}>
          My Library
        </h1>
        <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
          Content you&apos;ve saved, read, or downloaded.
        </p>
      </section>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)', paddingBottom: '0.875rem' }}>
        {TABS.map(t => (
          <Link key={t} href={`/dashboard/library?tab=${t}${type !== 'all' ? `&type=${type}` : ''}`} className="text-label-sm" style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            background: tab === t ? 'var(--color-ink-deep)' : 'transparent',
            color: tab === t ? '#ffffff' : 'var(--color-text-muted)',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'all 150ms',
          }}>
            {TAB_LABELS[t]}
          </Link>
        ))}
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.75rem' }}>
        {TYPE_OPTIONS.map(t => (
          <Link key={t} href={`/dashboard/library?tab=${tab}&type=${t}`} className="text-label-sm" style={{
            padding: '0.375rem 1rem',
            borderRadius: '0.125rem',
            background: type === t ? 'var(--color-ink-deep)' : 'var(--color-paper-darker)',
            color: type === t ? '#ffffff' : 'var(--color-ink-deep)',
            border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
            textDecoration: 'none',
          }}>
            {TYPE_LABELS[t]}
          </Link>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {filtered.map(item => (
            <LibraryRow
              key={item.id}
              item={item}
              typeLabel={TYPE_LABELS[item.type] ?? item.type}
              href={HREF_BY_TYPE[item.type]?.(item.slug) ?? `/content/${item.slug}`}
              badge={tab === 'favorites' ? 'Favorited' : undefined}
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--color-paper-darker)', borderRadius: '0.75rem', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)' }}>
          <p className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: '0 0 0.75rem' }}>
            {tab === 'favorites' ? 'No favorites yet' : 'Your library is empty'}
          </p>
          <p className="text-body-md" style={{ color: 'var(--color-text-muted)', margin: '0 0 1.5rem' }}>
            {tab === 'favorites'
              ? 'Tap the favorite button on any article, ebook, or template to save it here.'
              : 'Start reading articles or downloading resources to see them here.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/articles" className="btn-primary">Browse articles</Link>
            <Link href="/library" className="btn-outline">Browse library</Link>
          </div>
        </div>
      )}
    </div>
  )
}

function LibraryRow({
  item,
  typeLabel,
  href,
  badge,
}: {
  item: { title: string; summary: string | null; cover_image_url: string | null }
  typeLabel: string
  href: string
  badge?: string
}) {
  return (
    <Link href={href} style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      gap: '1rem',
      background: '#ffffff',
      border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
      borderRadius: '0.5rem',
      padding: '1rem',
      textDecoration: 'none',
      alignItems: 'center',
    }}>
      {item.cover_image_url && (
        <img loading="lazy" src={item.cover_image_url} alt="" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '0.25rem', flexShrink: 0 }} />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
          {badge && <span className="badge" style={{ background: '#fffbeb', color: '#b45309' }}>{badge}</span>}
          <span className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-text-muted)' }}>{typeLabel}</span>
        </div>
        <p className="text-body-md" style={{ margin: '0 0 0.25rem', fontWeight: 600, color: 'var(--color-ink-deep)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </p>
        {item.summary && (
          <p className="text-body-sm" style={{ margin: 0, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.summary}
          </p>
        )}
      </div>
    </Link>
  )
}
