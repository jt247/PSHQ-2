import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@pshq/api-client/server'
import { ContentCard } from '@/components/content/ContentCard'
import { LibrarySearch } from '@/components/content/LibrarySearch'
import { LibrarySelectFilter } from '@/components/content/LibrarySelectFilter'
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
  type?: string; pricing?: string; domain?: string; level?: string
  topic?: string; role?: string; goal?: string; intent?: string
  time?: string; series?: string; search?: string; sort?: string
}
interface Props { searchParams: Promise<SearchParams> }

const TYPE_OPTIONS = ['all', 'article', 'ebook', 'template', 'course', 'guide', 'build_note'] as const
const PRICING_OPTIONS = ['all', 'free', 'paid'] as const
const DOMAIN_OPTIONS = ['all', 'product', 'growth', 'ai', 'building', 'careers', 'leadership'] as const
const LEVEL_OPTIONS = ['all', 'exploring', 'beginner', 'intermediate', 'senior', 'leader'] as const
const INTENT_OPTIONS = ['all', 'Learn', 'Build', 'Plan', 'Evaluate', 'Practice', 'Prepare', 'Get hired', 'Lead', 'Grow'] as const
const TIME_OPTIONS = ['all', 'short', 'medium', 'long'] as const
const SORT_OPTIONS = ['recommended', 'newest', 'oldest', 'most_completed', 'highest_rated', 'most_saved'] as const

const TYPE_LABELS: Record<string, string> = { all: 'All', article: 'Articles', ebook: 'E-books', template: 'Templates', course: 'Courses', guide: 'Guides', build_note: 'Build Notes' }
const DOMAIN_LABELS: Record<string, string> = { all: 'All domains', product: 'Product', growth: 'Growth', ai: 'AI', building: 'Building', careers: 'Careers', leadership: 'Leadership' }
const LEVEL_LABELS: Record<string, string> = { all: 'All levels', exploring: 'Exploring', beginner: 'Beginner', intermediate: 'Intermediate', senior: 'Senior', leader: 'Leader' }
const TIME_LABELS: Record<string, string> = { all: 'Any length', short: 'Under 10 min', medium: '10–25 min', long: '25+ min' }
const SORT_LABELS: Record<string, string> = { recommended: 'Recommended', newest: 'Newest first', oldest: 'Oldest first', most_completed: 'Most completed', highest_rated: 'Highest rated', most_saved: 'Most saved' }

interface Item {
  id: string; title: string; slug: string; type: string; summary: string | null
  cover_image_url: string | null; tags: string[]; published_at: string | null
  is_coming_soon: boolean; pricing_type: string; selar_url: string | null
  view_count: number; upvote_count: number
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
    type = 'all', pricing = 'all', domain = 'all', level = 'all',
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
    .select('id,title,slug,type,summary,cover_image_url,tags,pricing_type,selar_url,view_count,upvote_count,published_at,is_coming_soon,domain,level,resource_intent,estimated_time_minutes,series_id')
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

  // Topic/role/goal filters need a join-table lookup — apply after the
  // main query rather than trying to express them in the query builder.
  if (topic !== 'all') {
    const topicRow = (topics ?? []).find(t => t.name === topic)
    if (topicRow) {
      const { data: matches } = await supabase.from('content_topics').select('content_id').eq('topic_id', topicRow.id)
      const ids = new Set((matches ?? []).map(m => m.content_id))
      items = items.filter(i => ids.has(i.id))
    }
  }
  if (role !== 'all') {
    const roleRow = (roles ?? []).find(r => r.name === role)
    if (roleRow) {
      const { data: matches } = await supabase.from('content_roles').select('content_id').eq('role_id', roleRow.id)
      const ids = new Set((matches ?? []).map(m => m.content_id))
      items = items.filter(i => ids.has(i.id))
    }
  }
  if (goal !== 'all') {
    const goalRow = (goals ?? []).find(g => g.name === goal)
    if (goalRow) {
      const { data: matches } = await supabase.from('content_goals').select('content_id').eq('goal_id', goalRow.id)
      const ids = new Set((matches ?? []).map(m => m.content_id))
      items = items.filter(i => ids.has(i.id))
    }
  }

  const byPricing = pricing === 'all' ? items : items.filter(i => i.pricing_type === pricing)

  const searchTerm = search.trim().toLowerCase()
  const filtered = !searchTerm ? byPricing : byPricing.filter(i => {
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
  // featured + upvotes + views. view_count is used only to compute this
  // ordering — never rendered, per the standing public-view-count ban.
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
    // recommended (default)
    sorted = [...filtered].sort((a, b) => {
      const scoreOf = (i: Item) => i.upvote_count * 3 + i.view_count * 0.1
      return scoreOf(b) - scoreOf(a)
    })
  }

  function buildUrl(overrides: Partial<Record<keyof SearchParams, string>>) {
    const current: Record<string, string> = { type, pricing, domain, level, topic, role, goal, intent, time, series, sort }
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries({ ...current, ...overrides })) {
      if (value && value !== 'all' && !(key === 'sort' && value === 'recommended')) params.set(key, value)
    }
    if (search) params.set('search', search)
    return `/library?${params.toString()}`
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/library" />

      <main style={{ flex: 1, maxWidth: '80rem', margin: '0 auto', width: '100%', padding: '5rem var(--spacing-margin-edge)' }}>
        <section style={{ maxWidth: '42ch', marginBottom: '3rem' }}>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.875rem' }}>Library</h1>
          <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
            A curated collection of resources for the thoughtful creator. From deep-dive articles to interactive courses, designed to help you synthesize ideas and cultivate professional mastery.
          </p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <Suspense fallback={<div style={{ maxWidth: '28rem', height: '44px', borderRadius: '0.25rem', background: 'var(--color-paper-darker)' }} />}>
            <LibrarySearch initialValue={search} />
          </Suspense>
        </section>

        <section style={{ borderTop: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)', borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)', padding: '1.25rem 0', marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FilterRow label="Content Type" options={TYPE_OPTIONS as readonly string[]} labels={TYPE_LABELS} active={type} makeHref={v => buildUrl({ type: v })} />
          <FilterRow label="Domain" options={DOMAIN_OPTIONS as readonly string[]} labels={DOMAIN_LABELS} active={domain} makeHref={v => buildUrl({ domain: v })} />
          <FilterRow label="Level" options={LEVEL_OPTIONS as readonly string[]} labels={LEVEL_LABELS} active={level} makeHref={v => buildUrl({ level: v })} />
          <FilterRow label="Intent" options={INTENT_OPTIONS as readonly string[]} labels={{ all: 'Any intent' }} active={intent} makeHref={v => buildUrl({ intent: v })} />
          <FilterRow label="Estimated Time" options={TIME_OPTIONS as readonly string[]} labels={TIME_LABELS} active={time} makeHref={v => buildUrl({ time: v })} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <LibrarySelectFilter
              label="Topic" active={topic} allLabel="All topics"
              options={['all', ...(topics ?? []).map(t => t.name)]}
              hrefFor={Object.fromEntries(['all', ...(topics ?? []).map(t => t.name)].map(v => [v, buildUrl({ topic: v })]))}
            />
            <LibrarySelectFilter
              label="Role" active={role} allLabel="All roles"
              options={['all', ...(roles ?? []).map(r => r.name)]}
              hrefFor={Object.fromEntries(['all', ...(roles ?? []).map(r => r.name)].map(v => [v, buildUrl({ role: v })]))}
            />
            <LibrarySelectFilter
              label="Goal" active={goal} allLabel="All goals"
              options={['all', ...(goals ?? []).map(g => g.name)]}
              hrefFor={Object.fromEntries(['all', ...(goals ?? []).map(g => g.name)].map(v => [v, buildUrl({ goal: v })]))}
            />
            <LibrarySelectFilter
              label="Series" active={series} allLabel="All series"
              options={['all', ...(seriesList ?? []).map(s => s.slug)]}
              optionLabels={Object.fromEntries((seriesList ?? []).map(s => [s.slug, s.title]))}
              hrefFor={Object.fromEntries(['all', ...(seriesList ?? []).map(s => s.slug)].map(v => [v, buildUrl({ series: v })]))}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {PRICING_OPTIONS.map(p => (
                <a key={p} href={buildUrl({ pricing: p })} className="text-label-sm" style={{
                  padding: '0.375rem 1rem', borderRadius: '0.125rem',
                  background: pricing === p ? 'var(--color-ink-deep)' : 'transparent',
                  color: pricing === p ? '#ffffff' : 'var(--color-text-muted)',
                  border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
                  textDecoration: 'none', transition: 'all 150ms', textTransform: 'capitalize',
                }}>
                  {p === 'all' ? 'All pricing' : p}
                </a>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span className="text-label-sm" style={{ color: 'var(--color-text-muted)' }}>
                {sorted.length} {sorted.length === 1 ? 'resource' : 'resources'}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {SORT_OPTIONS.map(s => (
                  <a key={s} href={buildUrl({ sort: s })} className="text-label-sm" style={{
                    padding: '0.375rem 0.75rem', borderRadius: '0.125rem',
                    background: sort === s ? 'var(--color-ink-deep)' : 'transparent',
                    color: sort === s ? '#ffffff' : 'var(--color-text-muted)',
                    border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
                    textDecoration: 'none', transition: 'all 150ms',
                  }}>
                    {SORT_LABELS[s]}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

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

function FilterRow({ label, options, labels, active, makeHref }: { label: string; options: readonly string[]; labels: Record<string, string>; active: string; makeHref: (v: string) => string }) {
  return (
    <div>
      <p className="text-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: '0.5rem', opacity: 0.6 }}>{label}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {options.map(o => (
          <a key={o} href={makeHref(o)} className="text-label-sm" style={{
            padding: '0.375rem 1rem', borderRadius: '0.125rem',
            background: active === o ? 'var(--color-ink-deep)' : 'var(--color-paper-darker)',
            color: active === o ? '#ffffff' : 'var(--color-ink-deep)',
            border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
            textDecoration: 'none', transition: 'all 150ms',
          }}>
            {labels[o] ?? o}
          </a>
        ))}
      </div>
    </div>
  )
}

