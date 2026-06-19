import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { UserRow, ContentRow } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [profileRes, statsRes, trendingRes, ownedRes] = await Promise.all([
    supabase.from('users').select('full_name, areas_of_interest').eq('id', user.id).single(),
    supabase.from('content_interactions')
      .select('id, type', { count: 'exact' })
      .eq('user_id', user.id),
    supabase.from('content')
      .select('id, title, slug, type, view_count, upvote_count')
      .eq('status', 'published')
      .not('type', 'eq', 'course')
      .order('view_count', { ascending: false })
      .limit(5),
    supabase.from('content_interactions')
      .select('content:content_id(id, title, slug, type, cover_image_url, pricing_type)')
      .eq('user_id', user.id)
      .in('type', ['unlock', 'purchase'])
      .limit(6),
  ])

  const profile = profileRes.data as Pick<UserRow, 'full_name' | 'areas_of_interest'> | null
  const interactionCount = statsRes.count ?? 0
  const trending = (trendingRes.data ?? []) as Array<Pick<ContentRow, 'id' | 'title' | 'slug' | 'type' | 'view_count' | 'upvote_count'>>
  const ownedRaw = (ownedRes.data ?? []) as Array<{ content: Partial<ContentRow> | null }>
  const owned = ownedRaw.map(r => r.content).filter(Boolean) as Array<Partial<ContentRow>>

  const name = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div style={page}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={h1}>Good day, {name}</h1>
        <p style={sub}>Here&apos;s what&apos;s happening on PSHQ.</p>
      </div>

      <div style={statsGrid}>
        {[
          { label: 'Content interactions', value: interactionCount },
          { label: 'Items in library', value: owned.length },
          { label: 'Interest areas', value: ((profile?.areas_of_interest as string[] | null) ?? []).length },
        ].map(s => (
          <div key={s.label} style={statCard}>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827' }}>{s.value}</span>
            <span style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={twoCol}>
        <section style={section}>
          <h2 style={sectionHead}>Trending content</h2>
          {trending.length === 0 ? (
            <p style={emptyText}>Nothing trending yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {trending.map((c, i) => (
                <Link
                  key={c.id}
                  href={c.type === 'article' ? `/articles/${c.slug}` : `/content/${c.slug}`}
                  style={listItem}
                >
                  <span style={{ color: '#d1d5db', fontSize: '0.8125rem', width: '1.25rem', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ flex: 1, color: '#111827', fontWeight: 500, fontSize: '0.9375rem' }}>
                    {c.title}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{c.view_count ?? 0} views</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section style={section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ ...sectionHead, margin: 0 }}>My library</h2>
            <Link href="/library" style={{ fontSize: '0.8125rem', color: '#6366f1' }}>Browse all →</Link>
          </div>
          {owned.length === 0 ? (
            <p style={emptyText}>
              No content unlocked yet.{' '}
              <Link href="/library" style={{ color: '#6366f1' }}>Explore →</Link>
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {owned.map(c => (
                <Link
                  key={c.id}
                  href={c.type === 'article' ? `/articles/${c.slug}` : `/content/${c.slug}`}
                  style={listItem}
                >
                  <span style={{ flex: 1, color: '#111827', fontWeight: 500, fontSize: '0.9375rem' }}>{c.title}</span>
                  <span style={{ ...typeBadge, background: TYPE_BG[c.type ?? ''] ?? '#f3f4f6', color: TYPE_COLOR[c.type ?? ''] ?? '#374151' }}>
                    {c.type}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

const TYPE_BG: Record<string, string> = { article: '#dbeafe', ebook: '#fce7f3', template: '#dcfce7', course: '#fef3c7' }
const TYPE_COLOR: Record<string, string> = { article: '#1e40af', ebook: '#be185d', template: '#15803d', course: '#b45309' }

const page: React.CSSProperties = { maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif' }
const h1: React.CSSProperties = { fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0 }
const sub: React.CSSProperties = { color: '#6b7280', fontSize: '0.9375rem', margin: '0.25rem 0 0' }
const statsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }
const statCard: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column' }
const twoCol: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }
const section: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem 1.5rem' }
const sectionHead: React.CSSProperties = { fontSize: '1rem', fontWeight: 600, color: '#111827', margin: '0 0 1rem' }
const listItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid #f3f4f6', textDecoration: 'none' }
const emptyText: React.CSSProperties = { color: '#9ca3af', fontSize: '0.875rem', margin: 0 }
const typeBadge: React.CSSProperties = { display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }
