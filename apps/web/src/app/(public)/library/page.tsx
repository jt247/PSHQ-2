import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@pshq/api-client/server'
import { ContentCard } from '@/components/content/ContentCard'
import { LibrarySearch } from '@/components/content/LibrarySearch'
import { LibraryFilterBar } from '@/components/content/LibraryFilterBar'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { trackSearchPerformed, trackSearchZeroResults } from '@pshq/analytics'

// Canonical always points to the unfiltered base URL — filter/sort states
// are the same underlying content, just re-sliced, so they should never be
// treated as separate pages for indexing purposes.
export const metadata: Metadata = {
  title: 'Free PM Resources, Ebooks & Templates',
  description:
    'Browse free product management ebooks, templates, and articles. Practical resources for product managers, designers, and founders — no paywall, no signup wall for browsing.',
  alternates: { canonical: '/library' },
}

interface SearchParams {
  type?: string; domain?: string; level?: string
  topic?: string; role?: string; goal?: string; intent?: string
  time?: string; series?: string; search?: string; sort?: string
}
interface Props { searchParams: Promise<SearchParams> }

const TYPE_OPTIONS = ['all', 'article', 'ebook', 'template', 'course', 'guide', 'build_note'] as const
const DOMAIN_OPTIONS = ['all', 'product', 'growth', 'ai', 'building', 'careers', 'leadership'] as const
const LEVEL_OPTIONS = ['all', 'exploring', 'beginner', 'intermediate', 'senior', 'leader'] as const
const INTENT_OPTIONS = ['all', 'Learn', 'Build', 'Plan', 'Evaluate', 'Practice', 'Prepare', 'Get hired', 'Lead', 'Grow'] as const
const TIME_OPTIONS = ['all', 'short', 'medium', 'long'] as const
const SORT_OPTIONS = ['recommended', 'newest', 'oldest', 'most_completed', 'highest_rated', 'most_saved'] as const

const TYPE_LABELS: Record<string, string> = { all: 'All types', article: 'Articles', ebook: 'E-books', template: 'Templates', course: 'Courses', guide: 'Guides', build_note: 'Build Notes' }
const DOMAIN_LABELS: Record<string, string> = { all: 'All domains', product: 'Product', growth: 'Growth', ai: 'AI', building: 'Building', careers: 'Careers', leadership: 'Leadership' }
const LEVEL_LABELS: Record<string, string> = { all: 'All levels', exploring: 'Exploring', beginner: 'Beginner', intermediate: 'Intermediate', senior: 'Senior', leader: 'Leader' }
const TIME_LABELS: Record<string, string> = { all: 'Any length', short: 'Under 10 min', medium: '10–25 min', long: '25+ min' }
const SORT_LABELS: Record<string, string> = { recommended: 'Recommended', newest: 'Newest first', oldest: 'Oldest first', most_completed: 'Most completed', highest_rated: 'Highest rated', most_saved: 'Most saved' }

interface Item {
  id: string; title: string; slug: string; type: string; summary: string | null
  cover_image_url: string | null; tags: string[]; published_at: string | null
  is_coming_soon: boolean; view_count: number; upvote_count: number
  domain: string | null; level: string | null; resource_intent: string[]
  estimated_time_minutes: number | null; series_id: string | null
}

function timeBucket(minutes: number | null): 'short' | 'medium' | 'long' | null {
  if (minutes == null) return null
  if (minutes < 10) return 'short'
  if (minutes <= 25) return 'medium'
  return 'long'
}

export default async function LibraryPage({ searchParams }: Props) {
  const {
    type = 'all', domain = 'all', level = 'all',
    topic = 'all', role = 'all', goal = 'all', intent = 'all',
    time = 'all', series = 'all', search = '', sort = 'recommended',
  } = await searchParams
  const supabase = await createClient()

  const [{ data: topics }, { data: roles }, { data: goals }, { data: seriesList }] = await Promise.all([
    supabase.from('topics').select('id, name').order('sort_order'),
    supabase.from('roles').select('id, name').order('sort_order'),
    supabase.from('goals').select('id, name').order('sort_order'),
    supabase.from('series').select('id, slug, title').eq('status', 'published').order('display_order'),
  ])

  let query = supabase
    .from('content')
    .select('id,title,slug,type,summary,cover_image_url,tags,view_count,upvote_count,published_at,is_coming_soon,domain,level,resource_intent,estimated_time_minutes,series_id,needs_review')
    .eq('status', 'published')

  if (type !== 'all') query = query.eq('type', type)
  if (domain !== 'all') query = query.eq('domain', domain)
  if (level !== 'all') query = query.eq('level', level)
  if (intent !== 'all') query = query.contains('resource_intent', [intent])
  if (series !== 'all') {
    const seriesRow = (seriesList ?? []).find(s => s.slug === series)
    if (seriesRow) query = query.eq('series_id', seriesRow.id)
  }

  const { data: rawItems } = await query
  let items = (rawItems ?? []) as Item[]

  if (time !== 'all') items = items.filter(i => timeBucket(i.estimated_time_minutes) === time)

  // Topic/role/goal filters need a join-table lookup — run only the ones
  // actually selected, in parallel, rather than three sequential
  // round-trips regardless of which are active (part of the "feels slow"
  // fix alongside the batched Apply button).
  const topicId = topic !== 'all' ? (topics ?? []).find(t => t.name === topic)?.id : undefined
  const roleId = role !== 'all' ? (roles ?? []).find(r => r.name === role)?.id : undefined
  const goalId = goal !== 'all' ? (goals ?? []).find(g => g.name === goal)?.id : undefined

  const [topicMatches, roleMatches, goalMatches] = await Promise.all([
    topicId ? supabase.from('content_topics').select('content_id').eq('topic_id', topicId) : Promise.resolve(null),
    roleId ? supabase.from('content_roles').select('content_id').eq('role_id', roleId) : Promise.resolve(null),
    goalId ? supabase.from('content_goals').select('content_id').eq('goal_id', goalId) : Promise.resolve(null),
  ])
  if (topicMatches) { const ids = new Set((topicMatches.data ?? []).map(m => m.content_id)); items = items.filter(i => ids.has(i.id)) }
  if (roleMatches) { const ids = new Set((roleMatches.data ?? []).map(m => m.content_id)); items = items.filter(i => ids.has(i.id)) }
  if (goalMatches) { const ids = new Set((goalMatches.data ?? []).map(m => m.content_id)); items = items.filter(i => ids.has(i.id)) }

  const searchTerm = search.trim().toLowerCase()
  const filtered = !searchTerm ? items : items.filter(i => {
    const haystack = [i.title, i.summary ?? '', ...(i.tags ?? [])].join(' ').toLowerCase()
    return haystack.includes(searchTerm)
  })

  if (searchTerm) {
    const { data: { user } } = await supabase.auth.getUser()
    const ctx = { supabase, source: 'web' as const, userId: user?.id ?? null }
    await trackSearchPerformed(ctx, searchTerm, filtered.length)
    if (filtered.length === 0) await trackSearchZeroResults(ctx, searchTerm)
  }

  // Sorting. "Most completed"/"Highest rated"/"Most saved" need real
  // aggregation, not just an ORDER BY — fetched here and reduced in
  // memory, since the library is a few dozen items, not a scale where
  // that matters. "Recommended" is the rules-based P1 default (no AI,
  // Epic E is out of scope): a simple internal quality score from
  // upvotes + views. view_count is used only to compute this ordering —
  // never rendered, per the standing public-view-count ban.
  const ids = filtered.map(i => i.id)
  let sorted = filtered
  if (sort === 'newest' || sort === 'oldest') {
    sorted = [...filtered].sort((a, b) => {
      const da = a.published_at ? new Date(a.published_at).getTime() : 0
      const db = b.published_at ? new Date(b.published_at).getTime() : 0
      return sort === 'oldest' ? da - db : db - da
    })
  } else if (sort === 'most_saved' && ids.length > 0) {
    const { data: favs } = await supabase.from('content_favorites').select('content_id').in('content_id', ids)
    const counts = new Map<string, number>()
    for (const f of favs ?? []) counts.set(f.content_id, (counts.get(f.content_id) ?? 0) + 1)
    sorted = [...filtered].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
  } else if (sort === 'highest_rated' && ids.length > 0) {
    const { data: ratingRows } = await supabase.from('ratings').select('content_id, rating').in('content_id', ids)
    const sums = new Map<string, { total: number; n: number }>()
    for (const r of ratingRows ?? []) {
      const cur = sums.get(r.content_id) ?? { total: 0, n: 0 }
      sums.set(r.content_id, { total: cur.total + r.rating, n: cur.n + 1 })
    }
    sorted = [...filtered].sort((a, b) => {
      const aAvg = sums.has(a.id) ? sums.get(a.id)!.total / sums.get(a.id)!.n : -1
      const bAvg = sums.has(b.id) ? sums.get(b.id)!.total / sums.get(b.id)!.n : -1
      return bAvg - aAvg
    })
  } else if (sort === 'most_completed' && ids.length > 0) {
    const { data: progressRows } = await supabase.from('content_progress').select('content_id').eq('status', 'completed').in('content_id', ids)
    const counts = new Map<string, number>()
    for (const p of progressRows ?? []) counts.set(p.content_id, (counts.get(p.content_id) ?? 0) + 1)
    sorted = [...filtered].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
  } else {
    sorted = [...filtered].sort((a, b) => {
      const scoreOf = (i: Item) => i.upvote_count * 3 + i.view_count * 0.1
      return scoreOf(b) - scoreOf(a)
    })
  }

  const toOptions = (values: readonly string[], labels: Record<string, string>) => values.map(v => ({ value: v, label: labels[v] ?? v }))

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/library" />

      <main style={{ flex: 1, maxWidth: '80rem', margin: '0 auto', width: '100%', padding: '5rem var(--spacing-margin-edge)' }}>
        <section style={{ maxWidth: '42ch', marginBottom: '2rem' }}>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.875rem' }}>Library</h1>
          <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
            A curated collection of resources for the thoughtful creator. From deep-dive articles to interactive courses, designed to help you synthesize ideas and cultivate professional mastery.
          </p>
        </section>

        <section style={{ marginBottom: '1.25rem' }}>
          <Suspense fallback={<div style={{ maxWidth: '28rem', height: '44px', borderRadius: '0.25rem', background: 'var(--color-paper-darker)' }} />}>
            <LibrarySearch initialValue={search} />
          </Suspense>
        </section>

        <LibraryFilterBar
          initial={{ type, domain, level, intent, time, topic, role, goal, series, sort }}
          search={search}
          typeOptions={toOptions(TYPE_OPTIONS, TYPE_LABELS)}
          domainOptions={toOptions(DOMAIN_OPTIONS, DOMAIN_LABELS)}
          levelOptions={toOptions(LEVEL_OPTIONS, LEVEL_LABELS)}
          intentOptions={toOptions(INTENT_OPTIONS, { all: 'Any intent' })}
          timeOptions={toOptions(TIME_OPTIONS, TIME_LABELS)}
          topicOptions={[{ value: 'all', label: 'All topics' }, ...(topics ?? []).map(t => ({ value: t.name, label: t.name }))]}
          roleOptions={[{ value: 'all', label: 'All roles' }, ...(roles ?? []).map(r => ({ value: r.name, label: r.name }))]}
          goalOptions={[{ value: 'all', label: 'All goals' }, ...(goals ?? []).map(g => ({ value: g.name, label: g.name }))]}
          seriesOptions={[{ value: 'all', label: 'All series' }, ...(seriesList ?? []).map(s => ({ value: s.slug, label: s.title }))]}
          sortOptions={toOptions(SORT_OPTIONS, SORT_LABELS)}
          resultCount={sorted.length}
        />

        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <p className="text-headline-md" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>No resources found</p>
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)' }}>
              {searchTerm ? `Nothing matches "${search}". Try a different keyword or filter.` : 'Try a different filter'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
            {sorted.map(item => <ContentCard key={item.id} {...item} />)}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
