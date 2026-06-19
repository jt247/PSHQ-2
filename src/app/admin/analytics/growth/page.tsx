import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRow } from '@/types/database'
import {
  getDailySignups, getSignupBreakdown, getCohortRetention,
  daysAgo, type Days,
} from '@/lib/analytics/queries'
import { GrowthClient } from './client'

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

// Power user threshold: interactions per month. Adjust here + surfaced in UI.
const POWER_USER_THRESHOLD = 5
const CASUAL_THRESHOLD = 2

export default async function GrowthAnalyticsPage({ searchParams }: PageProps) {
  const { days: daysParam } = await searchParams
  const days = ([7, 14, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30) as Days

  const supabase = await requireAdmin()

  const [dailySignups, breakdown, cohorts] = await Promise.all([
    getDailySignups(days),
    getSignupBreakdown(),
    getCohortRetention(),
  ])

  // Activation funnel: signups → first unlock within 24h / 7d
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, created_at')
    .eq('role', 'user')
    .gte('created_at', daysAgo(days))

  const { data: unlockInteractions } = await supabase
    .from('content_interactions')
    .select('user_id, created_at')
    .eq('type', 'unlock')
    .not('user_id', 'is', null)

  // Map first unlock time per user
  const firstUnlock = new Map<string, Date>()
  for (const r of (unlockInteractions ?? []) as Array<{ user_id: string; created_at: string }>) {
    const existing = firstUnlock.get(r.user_id)
    const d = new Date(r.created_at)
    if (!existing || d < existing) firstUnlock.set(r.user_id, d)
  }

  const users = (allUsers ?? []) as Array<{ id: string; created_at: string }>
  let activated24h = 0, activated7d = 0
  for (const u of users) {
    const signedUp = new Date(u.created_at)
    const unlocked = firstUnlock.get(u.id)
    if (!unlocked) continue
    const diff = unlocked.getTime() - signedUp.getTime()
    if (diff <= 864e5) activated24h++
    if (diff <= 7 * 864e5) activated7d++
  }
  const totalNewUsers = users.length

  // Engagement segments: count interactions per user over last 30d
  const { data: interactionData } = await supabase
    .from('content_interactions')
    .select('user_id')
    .not('user_id', 'is', null)
    .gte('created_at', daysAgo(30))

  const { data: allUsersTotal } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'user')

  const interCountMap = new Map<string, number>()
  for (const r of (interactionData ?? []) as Array<{ user_id: string }>) {
    interCountMap.set(r.user_id, (interCountMap.get(r.user_id) ?? 0) + 1)
  }

  const totalUsers = (allUsersTotal as unknown as { count: number } | null)?.count ?? 0
  let power = 0, casual = 0, dormant = 0
  for (const [, count] of interCountMap) {
    if (count >= POWER_USER_THRESHOLD) power++
    else if (count >= CASUAL_THRESHOLD) casual++
    else casual++ // 1-count = low casual
  }
  dormant = Math.max(0, totalUsers - interCountMap.size)

  // Content-led growth: last_content_viewed_before_signup on user record (if tracked)
  // This column may not exist yet; surface a note if null
  const { data: contentLedData } = await supabase
    .from('users')
    .select('last_content_viewed_before_signup')
    .eq('role', 'user')
    .not('last_content_viewed_before_signup', 'is', null)
    .limit(1)
  const contentLedTracked = false // column not yet in schema; note in UI

  const payload = {
    days,
    dailySignups,
    breakdown: {
      byCountry: breakdown.byCountry,
      byRole: breakdown.byRole,
    },
    activation: {
      totalNewUsers,
      activated24h,
      activated7d,
      rate24h: totalNewUsers > 0 ? Math.round(activated24h / totalNewUsers * 100) : 0,
      rate7d: totalNewUsers > 0 ? Math.round(activated7d / totalNewUsers * 100) : 0,
    },
    cohorts,
    segments: {
      total: totalUsers,
      power,
      casual,
      dormant,
      powerThreshold: POWER_USER_THRESHOLD,
      casualThreshold: CASUAL_THRESHOLD,
    },
    contentLedTracked,
  }

  return <GrowthClient data={payload} />
}
