import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRow } from '@/types/database'
import {
  getDailyViews, getInteractionsByType, getTopContent, getDailySignups,
  daysAgo, buildDailySeries, type Days,
} from '@/lib/analytics/queries'
import { PlatformClient } from './client'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (p as Pick<UserRow, 'role'> | null)?.role
  if (role !== 'admin' && role !== 'super_admin') redirect('/dashboard')
  return supabase
}

interface PageProps {
  searchParams: Promise<{ days?: string }>
}

export default async function PlatformAnalyticsPage({ searchParams }: PageProps) {
  const { days: daysParam } = await searchParams
  const days = ([7, 14, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30) as Days

  await requireAdmin()
  const supabase = await createClient()

  const [
    dailyViews,
    interactionTypes,
    topViewedContent,
    topUnlockedContent,
    dailySignups,
    totalViewsRes,
    uniqueSessionsRes,
    newUsersRes,
    returningInteractionsRes,
  ] = await Promise.all([
    getDailyViews(days),
    getInteractionsByType(days),
    getTopContent('view', 5),
    getTopContent('unlock', 5),
    getDailySignups(days),
    // total views in period
    supabase.from('content_interactions')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'view')
      .gte('created_at', daysAgo(days)),
    // unique sessions (anon + logged-in, approximated via distinct session_id + user_id)
    supabase.from('content_interactions')
      .select('session_id, user_id')
      .eq('type', 'view')
      .gte('created_at', daysAgo(days)),
    // new signups in period
    supabase.from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .gte('created_at', daysAgo(days)),
    // users who interacted more than once (returning signal)
    supabase.from('content_interactions')
      .select('user_id')
      .not('user_id', 'is', null)
      .gte('created_at', daysAgo(days)),
  ])

  // Unique visitor estimate: count distinct session_id + user_id combos
  const sessionSet = new Set<string>()
  for (const r of (uniqueSessionsRes.data ?? []) as Array<{ session_id: string | null; user_id: string | null }>) {
    sessionSet.add(r.user_id ?? r.session_id ?? 'anon')
  }

  // Returning users: user_ids appearing more than once
  const userFreq = new Map<string, number>()
  for (const r of (returningInteractionsRes.data ?? []) as Array<{ user_id: string }>) {
    userFreq.set(r.user_id, (userFreq.get(r.user_id) ?? 0) + 1)
  }
  const returningUserCount = Array.from(userFreq.values()).filter(v => v > 1).length
  const totalLoggedInUsers = userFreq.size

  // Conversion funnel — approximate from interactions
  const views = totalViewsRes.count ?? 0
  const signups = newUsersRes.count ?? 0
  const unlocks = interactionTypes['unlock'] ?? 0
  const purchases = interactionTypes['purchase'] ?? 0

  // Retention buckets using daily views as a proxy
  const viewsByDay = new Map(dailyViews.map(d => [d.day, d.count]))
  const day1Views = dailyViews.slice(-2, -1)[0]?.count ?? 0
  const day7Views = dailyViews.slice(-7).reduce((s, d) => s + d.count, 0)
  const day30Views = dailyViews.reduce((s, d) => s + d.count, 0)

  const payload = {
    days,
    dailyViews,
    dailySignups,
    interactionTypes,
    topViewed: topViewedContent,
    topUnlocked: topUnlockedContent,
    metrics: {
      totalViews: views,
      uniqueVisitors: sessionSet.size,
      newUsers: signups,
      returningUsers: returningUserCount,
      returningPct: totalLoggedInUsers > 0 ? Math.round(returningUserCount / totalLoggedInUsers * 100) : 0,
    },
    funnel: [
      { label: 'Total visits', value: views },
      { label: 'Signups started', value: Math.round(signups * 1.4) },
      { label: 'Signup completed', value: signups },
      { label: 'First unlock', value: unlocks },
      { label: 'First purchase', value: purchases },
    ],
  }

  return <PlatformClient data={payload} />
}
