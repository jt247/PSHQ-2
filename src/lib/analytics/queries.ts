import { createClient } from '@/lib/supabase/server'

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

/** Revenue stats from purchases */
export async function getRevenueStats(days: Days) {
  const supabase = await createClient()
  const [allRes, windowRes] = await Promise.all([
    supabase.from('purchases').select('amount').eq('status', 'completed'),
    supabase.from('purchases').select('amount').eq('status', 'completed').gte('created_at', daysAgo(days)),
  ])

  const totalRevenue = ((allRes.data ?? []) as Array<{ amount: number }>).reduce((s, r) => s + r.amount, 0)
  const windowRevenue = ((windowRes.data ?? []) as Array<{ amount: number }>).reduce((s, r) => s + r.amount, 0)
  return { totalRevenue, windowRevenue, transactionCount: allRes.data?.length ?? 0 }
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

/** Revenue by country / job_role (super_admin only) */
export async function getRevenueBreakdown() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('purchases')
    .select('amount, user:user_id(country, job_role)')
    .eq('status', 'completed')

  const byCountry: Record<string, number> = {}
  const byRole: Record<string, number> = {}

  for (const r of ((data as unknown[]) ?? []) as Array<{ amount: number; user: { country: string | null; job_role: string | null } | null }>) {
    const c = r.user?.country ?? 'Unknown'
    const j = r.user?.job_role ?? 'Unknown'
    byCountry[c] = (byCountry[c] ?? 0) + r.amount
    byRole[j] = (byRole[j] ?? 0) + r.amount
  }

  return {
    byCountry: Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 8),
    byRole: Object.entries(byRole).sort((a, b) => b[1] - a[1]).slice(0, 8),
  }
}
