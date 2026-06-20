import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function MyLibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // Articles the user has viewed
  const { data: viewedRaw } = await supabase
    .from('content_interactions')
    .select('content_id, created_at, content:content(id, title, slug, type, summary, cover_image_url, tags, published_at)')
    .eq('user_id', user.id)
    .eq('type', 'view')
    .order('created_at', { ascending: false })

  // Purchased / unlocked non-article content
  const { data: unlockedRaw } = await supabase
    .from('content_interactions')
    .select('content_id, created_at, content:content(id, title, slug, type, summary, cover_image_url, tags, file_url, published_at)')
    .eq('user_id', user.id)
    .in('type', ['unlock'])
    .order('created_at', { ascending: false })

  type ContentRef = {
    id: string
    title: string
    slug: string
    type: string
    summary: string | null
    cover_image_url: string | null
    tags: string[]
    file_url?: string | null
    published_at: string | null
  }

  // Deduplicate viewed articles by content_id
  const seenIds = new Set<string>()
  const viewedArticles: ContentRef[] = []
  for (const row of (viewedRaw ?? [])) {
    const c = row.content as unknown as ContentRef | null
    if (c && c.type === 'article' && !seenIds.has(c.id)) {
      seenIds.add(c.id)
      viewedArticles.push(c)
    }
  }

  const seenPaidIds = new Set<string>()
  const unlockedItems: ContentRef[] = []
  for (const row of (unlockedRaw ?? [])) {
    const c = row.content as unknown as ContentRef | null
    if (c && !seenPaidIds.has(c.id)) {
      seenPaidIds.add(c.id)
      unlockedItems.push(c)
    }
  }

  const TYPE_LABELS: Record<string, string> = { ebook: 'Ebook', template: 'Template', course: 'Course', article: 'Article' }

  return (
    <div className="dash-content">
      <section style={{ marginBottom: '2.5rem' }}>
        <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.375rem' }}>
          My Library
        </h1>
        <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
          Content you&apos;ve read or unlocked.
        </p>
      </section>

      {unlockedItems.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: '0 0 1rem', fontSize: '1.125rem' }}>
            Unlocked Resources
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {unlockedItems.map(item => (
              <LibraryRow
                key={item.id}
                item={item}
                typeLabel={TYPE_LABELS[item.type] ?? item.type}
                badgeStyle={{ background: '#dcfce7', color: '#15803d' }}
                href={`/content/${item.slug}`}
                badge="Unlocked"
              />
            ))}
          </div>
        </section>
      )}

      {viewedArticles.length > 0 && (
        <section>
          <h2 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: '0 0 1rem', fontSize: '1.125rem' }}>
            Articles Read
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {viewedArticles.map(item => (
              <LibraryRow
                key={item.id}
                item={item}
                typeLabel="Article"
                badgeStyle={{ background: 'color-mix(in srgb, var(--color-ink-deep) 10%, transparent)', color: 'var(--color-ink-deep)' }}
                href={`/articles/${item.slug}`}
                badge="Read"
              />
            ))}
          </div>
        </section>
      )}

      {viewedArticles.length === 0 && unlockedItems.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--color-paper-darker)', borderRadius: '0.75rem', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)' }}>
          <p className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: '0 0 0.75rem' }}>Your library is empty</p>
          <p className="text-body-md" style={{ color: 'var(--color-text-muted)', margin: '0 0 1.5rem' }}>
            Start reading articles or unlock resources to see them here.
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
  badgeStyle,
  href,
  badge,
}: {
  item: { title: string; summary: string | null; cover_image_url: string | null; tags: string[] }
  typeLabel: string
  badgeStyle: React.CSSProperties
  href: string
  badge: string
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
        <img src={item.cover_image_url} alt="" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '0.25rem', flexShrink: 0 }} />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
          <span className="badge" style={badgeStyle}>{badge}</span>
          <span className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-text-muted)' }}>{typeLabel}</span>
        </div>
        <p className="text-body-md" style={{ margin: '0 0 0.25rem', fontWeight: 600, color: 'var(--color-ink-deep)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {(item as { title: string }).title}
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
