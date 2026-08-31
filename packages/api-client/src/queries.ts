import { createClient, createServiceClient } from './supabase/server'

export type Days = 7 | 14 | 30 | 90

/** ISO date N days ago */
export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

/** Build a daily series with zero-fill for missing days */
export function buildDailySeries(
  rows: Array<{ day: string; count: number }>,
  days: number,
): Array<{ day: string; count: number }> {
  const map = new Map(rows.map(r => [r.day.slice(0, 10), r.count]))
  const result: Array<{ day: string; count: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    result.push({ day: key, count: map.get(key) ?? 0 })
  }
  return result
}

/** Fetch interaction counts by type for a given window */
export async function getInteractionsByType(days: Days) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('content_interactions')
    .select('type')
    .gte('created_at', daysAgo(days))

  const counts: Record<string, number> = {}
  for (const row of (data ?? [])) {
    counts[row.type] = (counts[row.type] ?? 0) + 1
  }
  return counts
}

/** Daily views over the period */
export async function getDailyViews(days: Days) {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_daily_interaction_counts', {
    p_type: 'view',
    p_days: days,
  }).select()

  if (data) return buildDailySeries(data as Array<{ day: string; count: number }>, days)

  // Fallback: manual aggregation if RPC not available
  const { data: raw } = await supabase
    .from('content_interactions')
    .select('created_at')
    .eq('type', 'view')
    .gte('created_at', daysAgo(days))

  const dayMap = new Map<string, number>()
  for (const r of (raw ?? [])) {
    const key = (r.created_at as string).slice(0, 10)
    dayMap.set(key, (dayMap.get(key) ?? 0) + 1)
  }
  const rows = Array.from(dayMap.entries()).map(([day, count]) => ({ day, count }))
  return buildDailySeries(rows, days)
}

/** Daily signups */
export async function getDailySignups(days: Days) {
  const supabase = await createClient()
  const { data: raw } = await supabase
    .from('users')
    .select('created_at')
    .gte('created_at', daysAgo(days))

  const dayMap = new Map<string, number>()
  for (const r of (raw ?? [])) {
    const key = (r.created_at as string).slice(0, 10)
    dayMap.set(key, (dayMap.get(key) ?? 0) + 1)
  }
  const rows = Array.from(dayMap.entries()).map(([day, count]) => ({ day, count }))
  return buildDailySeries(rows, days)
}

/** Top content by interaction type */
export async function getTopContent(type: string, limit = 5) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('content_interactions')
    .select('content_id, content:content_id(title, type, slug)')
    .eq('type', type)

  const counts = new Map<string, { title: string; type: string; slug: string; count: number }>()
  for (const r of ((data as unknown[]) ?? []) as Array<{ content_id: string; content: { title: string; type: string; slug: string } | null }>) {
    if (!r.content) continue
    const existing = counts.get(r.content_id)
    if (existing) existing.count++
    else counts.set(r.content_id, { ...r.content, count: 1 })
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, limit)
}

/** Aggregate users table stats */
export async function getUserStats(days: Days) {
  const supabase = await createClient()
  const [totalRes, newRes, activeRes] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'user').gte('created_at', daysAgo(days)),
    supabase.from('content_interactions').select('user_id').gte('created_at', daysAgo(7)).not('user_id', 'is', null),
  ])

  const activeSet = new Set((activeRes.data ?? []).map(r => r.user_id))
  return {
    total: totalRes.count ?? 0,
    newUsers: newRes.count ?? 0,
    activeUsers7d: activeSet.size,
  }
}

/** Selar click counts — interest signal for paid resources */
export async function getSelarClicks(days: Days) {
  const supabase = await createClient()
  const [allRes, windowRes] = await Promise.all([
    supabase.from('content_interactions').select('id', { count: 'exact', head: true }).eq('type', 'selar_click'),
    supabase.from('content_interactions').select('id', { count: 'exact', head: true }).eq('type', 'selar_click').gte('created_at', daysAgo(days)),
  ])
  return { total: allRes.count ?? 0, window: windowRes.count ?? 0 }
}

/** Community engagement depth — avg content consumed per active member */
export async function getEngagementDepth(days: Days) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('content_interactions')
    .select('user_id, type')
    .not('user_id', 'is', null)
    .in('type', ['view', 'download', 'ai_summary_requested'])
    .gte('created_at', daysAgo(days))

  const byUser = new Map<string, number>()
  for (const r of (data ?? []) as Array<{ user_id: string }>) {
    byUser.set(r.user_id, (byUser.get(r.user_id) ?? 0) + 1)
  }
  const values = Array.from(byUser.values())
  const avgDepth = values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length * 10) / 10 : 0
  const engagedCount = values.filter(v => v >= 3).length
  return { avgDepth, engagedCount, activeUsers: values.length }
}

/** Returning member rate — users active in 2+ distinct weeks within the period */
export async function getReturningMemberRate(days: Days) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('content_interactions')
    .select('user_id, created_at')
    .not('user_id', 'is', null)
    .gte('created_at', daysAgo(days))

  const userWeeks = new Map<string, Set<string>>()
  for (const r of (data ?? []) as Array<{ user_id: string; created_at: string }>) {
    const d = new Date(r.created_at)
    const week = `${d.getFullYear()}-W${Math.ceil((d.getDate()) / 7)}`
    const s = userWeeks.get(r.user_id) ?? new Set<string>()
    s.add(week)
    userWeeks.set(r.user_id, s)
  }
  const total = userWeeks.size
  const returning = Array.from(userWeeks.values()).filter(s => s.size >= 2).length
  return { total, returning, rate: total > 0 ? Math.round(returning / total * 100) : 0 }
}

/** Most discussed content — by comments + upvotes combined */
export async function getMostDiscussed(limit = 5) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('content')
    .select('id, title, type, comment_count, upvote_count')
    .eq('status', 'published')
    .order('comment_count', { ascending: false })
    .limit(limit * 2)

  return ((data ?? []) as Array<{ id: string; title: string; type: string; comment_count: number; upvote_count: number }>)
    .map(c => ({ ...c, discussion_score: c.comment_count * 2 + c.upvote_count }))
    .sort((a, b) => b.discussion_score - a.discussion_score)
    .slice(0, limit)
}

/** AI summary usage rate — % of views that trigger a summary request */
export async function getAiSummaryRate(days: Days) {
  const supabase = await createClient()
  const [viewsRes, summaryRes] = await Promise.all([
    supabase.from('content_interactions').select('id', { count: 'exact', head: true }).eq('type', 'view').gte('created_at', daysAgo(days)),
    supabase.from('content_interactions').select('id', { count: 'exact', head: true }).eq('type', 'ai_summary_requested').gte('created_at', daysAgo(days)),
  ])
  const views = viewsRes.count ?? 0
  const summaries = summaryRes.count ?? 0
  return { views, summaries, rate: views > 0 ? Math.round(summaries / views * 100) : 0 }
}

/** Content performance breakdown by type */
export async function getContentByType() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('content')
    .select('type, id')
    .eq('status', 'published')

  const map: Record<string, number> = {}
  for (const r of (data ?? []) as Array<{ type: string }>) {
    map[r.type] = (map[r.type] ?? 0) + 1
  }
  return map
}

/** Cohort retention: group users by week of signup, check activity in later weeks */
export async function getCohortRetention() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('users')
    .select('id, created_at')
    .eq('role', 'user')
    .gte('created_at', daysAgo(60))
    .order('created_at')

  const { data: interactions } = await supabase
    .from('content_interactions')
    .select('user_id, created_at')
    .not('user_id', 'is', null)
    .gte('created_at', daysAgo(60))

  // Group interactions by user
  const userActivity = new Map<string, Date[]>()
  for (const i of (interactions ?? []) as Array<{ user_id: string; created_at: string }>) {
    const arr = userActivity.get(i.user_id) ?? []
    arr.push(new Date(i.created_at))
    userActivity.set(i.user_id, arr)
  }

  // Group users by signup week
  const cohorts = new Map<string, { users: Array<{ id: string; signedUp: Date }> }>()
  for (const u of (users ?? []) as Array<{ id: string; created_at: string }>) {
    const d = new Date(u.created_at)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().slice(0, 10)
    const cohort = cohorts.get(key) ?? { users: [] }
    cohort.users.push({ id: u.id, signedUp: d })
    cohorts.set(key, cohort)
  }

  const rows: Array<{ week: string; total: number; w1: number; w2: number; w4: number }> = []
  for (const [week, { users: cohortUsers }] of cohorts) {
    const total = cohortUsers.length
    let w1 = 0, w2 = 0, w4 = 0
    for (const { id, signedUp } of cohortUsers) {
      const acts = userActivity.get(id) ?? []
      const w1Start = new Date(signedUp.getTime() + 7 * 864e5)
      const w1End   = new Date(signedUp.getTime() + 14 * 864e5)
      const w2End   = new Date(signedUp.getTime() + 21 * 864e5)
      const w4End   = new Date(signedUp.getTime() + 35 * 864e5)
      if (acts.some(a => a >= w1Start && a < w1End)) w1++
      if (acts.some(a => a >= w1Start && a < w2End)) w2++
      if (acts.some(a => a >= w1Start && a < w4End)) w4++
    }
    rows.push({ week, total, w1: Math.round(w1 / total * 100), w2: Math.round(w2 / total * 100), w4: Math.round(w4 / total * 100) })
  }

  return rows.sort((a, b) => a.week.localeCompare(b.week)).slice(-8)
}

/** Signup breakdown by country and job_role */
export async function getSignupBreakdown() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('country, job_role')
    .eq('role', 'user')

  const byCountry: Record<string, number> = {}
  const byRole: Record<string, number> = {}
  for (const r of (data ?? []) as Array<{ country: string | null; job_role: string | null }>) {
    const c = r.country ?? 'Unknown'
    const j = r.job_role ?? 'Unknown'
    byCountry[c] = (byCountry[c] ?? 0) + 1
    byRole[j] = (byRole[j] ?? 0) + 1
  }

  return {
    byCountry: Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 8),
    byRole: Object.entries(byRole).sort((a, b) => b[1] - a[1]).slice(0, 8),
  }
}

/** Selar clicks breakdown by content — top paid resources by interest signal */
export async function getSelarClicksBreakdown(limit = 5) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('content_interactions')
    .select('content_id, content:content_id(title, type)')
    .eq('type', 'selar_click')

  const counts = new Map<string, { title: string; type: string; count: number }>()
  for (const r of ((data as unknown[]) ?? []) as Array<{ content_id: string; content: { title: string; type: string } | null }>) {
    if (!r.content) continue
    const e = counts.get(r.content_id) ?? { ...r.content, count: 0 }
    e.count++
    counts.set(r.content_id, e)
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, limit)
}

/** Full content performance table: views, clicks, unlocks, comments, upvotes, ratings */
// Interaction types that make sense to break out per content item in the
// performance table. 'read' and 'listen' only ever fire on ebooks/templates
// and articles respectively, so most rows show '—' for the type that
// doesn't apply to them — see ContentPerformanceRow rendering.
const TRACKED_TYPES = ['read', 'download', 'share', 'ai_summary_requested', 'listen'] as const
type TrackedType = typeof TRACKED_TYPES[number]

export async function getContentPerformanceTable() {
  const supabase = await createClient()

  // Pull all published content with stored counters
  const { data: content } = await supabase
    .from('content')
    .select('id, title, type, status, view_count, upvote_count, comment_count, published_at, pricing_type')
    .in('status', ['published', 'draft'])
    .order('view_count', { ascending: false })
    .limit(50)

  const contentList = (content ?? []) as Array<{
    id: string; title: string; type: string; status: string;
    view_count: number; upvote_count: number; comment_count: number;
    published_at: string | null; pricing_type: string;
  }>

  if (contentList.length === 0) return []

  const ids = contentList.map(c => c.id)

  // Ratings per content — column is `rating`, not `score` (this previously
  // queried a column that doesn't exist, so avgRating/ratingCount were
  // silently always null/0 regardless of real ratings).
  const { data: ratingsRaw } = await supabase
    .from('ratings')
    .select('content_id, rating')
    .in('content_id', ids)

  const ratingMap = new Map<string, { sum: number; count: number }>()
  for (const r of ((ratingsRaw ?? []) as Array<{ content_id: string; rating: number }>)) {
    const e = ratingMap.get(r.content_id) ?? { sum: 0, count: 0 }
    e.sum += r.rating
    e.count++
    ratingMap.set(r.content_id, e)
  }

  // Two queries, not one: 'read' and 'listen' are new enum values added in
  // migration 20260827000021. Until that migration actually runs against
  // this database, a single .in(TRACKED_TYPES) query that includes them
  // throws "invalid input value for enum" — and Postgres fails the WHOLE
  // query, not just the unknown values, which would silently zero out
  // download/share/ai_summary_requested too. Querying the always-valid
  // types separately from the possibly-not-yet-valid ones means this table
  // degrades to "no read/listen data yet" instead of "no data at all."
  const interactionMap = new Map<string, Record<TrackedType, number>>()
  const bump = (contentId: string, type: TrackedType) => {
    const counts = interactionMap.get(contentId) ?? { read: 0, download: 0, share: 0, ai_summary_requested: 0, listen: 0 }
    counts[type]++
    interactionMap.set(contentId, counts)
  }

  const { data: establishedRaw } = await supabase
    .from('content_interactions')
    .select('content_id, type')
    .in('type', ['download', 'share', 'ai_summary_requested'])
    .in('content_id', ids)
  for (const r of ((establishedRaw ?? []) as Array<{ content_id: string; type: TrackedType }>)) bump(r.content_id, r.type)

  try {
    const { data: newTypesRaw, error } = await supabase
      .from('content_interactions')
      .select('content_id, type')
      .in('type', ['read', 'listen'])
      .in('content_id', ids)
    if (error) throw error
    for (const r of ((newTypesRaw ?? []) as Array<{ content_id: string; type: TrackedType }>)) bump(r.content_id, r.type)
  } catch { /* migration not applied yet — reads/listens report as 0 until it is */ }

  return contentList.map(c => {
    const rating = ratingMap.get(c.id)
    const avgRating = rating && rating.count > 0 ? Math.round((rating.sum / rating.count) * 10) / 10 : null
    const counts = interactionMap.get(c.id) ?? { read: 0, download: 0, share: 0, ai_summary_requested: 0, listen: 0 }
    const isArticle = c.type === 'article'
    const engagementRate = c.view_count > 0
      ? Math.round(((c.comment_count + c.upvote_count + counts.share) / c.view_count) * 100)
      : 0

    return {
      id: c.id,
      title: c.title,
      type: c.type,
      status: c.status,
      views: c.view_count,
      reads: isArticle ? null : counts.read,
      downloads: isArticle ? null : counts.download,
      aiSummaries: isArticle ? counts.ai_summary_requested : null,
      listens: isArticle ? counts.listen : null,
      shares: counts.share,
      comments: c.comment_count,
      upvotes: c.upvote_count,
      ratingCount: rating?.count ?? 0,
      avgRating,
      engagementRate,
    }
  })
}

// "Top Community Member" — most engaged users, shown on the user dashboard.
// Weighted so actions that take more effort count for more: a comment is a
// bigger investment than a one-click upvote. Locked-in weights: comment=3,
// share=2, upvote=1, ai_summary_requested=1, download=1.
//
// content_interactions is RLS-locked to "self read" for regular users, so
// this needs the service client to see every user's activity, not just the
// caller's — this function is meant to be read by anyone viewing the
// dashboard, not gated to admins.
const LEADERBOARD_WEIGHTS: Record<'share' | 'ai_summary_requested' | 'download', number> = {
  share: 2,
  ai_summary_requested: 1,
  download: 1,
}

export async function getTopCommunityMembers(limit = 10) {
  const service = createServiceClient()

  const [commentsRes, upvotesRes, interactionsRes] = await Promise.all([
    service.from('content_comments').select('user_id'),
    service.from('content_upvotes').select('user_id'),
    service.from('content_interactions').select('user_id, type').in('type', ['share', 'ai_summary_requested', 'download']).not('user_id', 'is', null),
  ])

  const scores = new Map<string, number>()
  const bump = (userId: string | null, points: number) => {
    if (!userId) return
    scores.set(userId, (scores.get(userId) ?? 0) + points)
  }

  for (const r of ((commentsRes.data ?? []) as Array<{ user_id: string }>)) bump(r.user_id, 3)
  for (const r of ((upvotesRes.data ?? []) as Array<{ user_id: string }>)) bump(r.user_id, 1)
  for (const r of ((interactionsRes.data ?? []) as Array<{ user_id: string | null; type: keyof typeof LEADERBOARD_WEIGHTS }>)) {
    bump(r.user_id, LEADERBOARD_WEIGHTS[r.type] ?? 0)
  }

  const topIds = Array.from(scores.entries())
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  if (topIds.length === 0) return []

  const { data: users } = await service
    .from('users')
    .select('id, full_name, avatar_url')
    .in('id', topIds.map(([id]) => id))

  const userMap = new Map((users ?? []).map((u: { id: string; full_name: string | null; avatar_url: string | null }) => [u.id, u]))

  return topIds.map(([id, score], i) => ({
    rank: i + 1,
    userId: id,
    name: userMap.get(id)?.full_name ?? 'Member',
    avatarUrl: userMap.get(id)?.avatar_url ?? null,
    score,
  }))
}
