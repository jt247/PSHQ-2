import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRow } from '@/types/database'
import {
  getUserStats, getSelarClicks, getInteractionsByType, getTopContent,
  getContentByType, getEngagementDepth, getReturningMemberRate,
  getMostDiscussed, getAiSummaryRate, getSelarClicksBreakdown, getContentPerformanceTable, daysAgo, type Days,
} from '@/lib/analytics/queries'
import { ProductClient } from './client'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (p as Pick<UserRow, 'role'> | null)?.role
  if (role !== 'admin' && role !== 'super_admin') redirect('/dashboard')
  return { role: role! }
}

interface PageProps {
  searchParams: Promise<{ days?: string }>
}

export default async function ProductAnalyticsPage({ searchParams }: PageProps) {
  const { days: daysParam } = await searchParams
  const days = ([7, 14, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30) as Days

  await requireAdmin()

  const [
    userStats,
    selarClicks,
    interactionTypes,
    topViewed,
    topUnlocked,
    contentByType,
    engagementDepth,
    returningRate,
    mostDiscussed,
    aiSummaryRate,
    selarClicksBreakdown,
    contentPerformance,
  ] = await Promise.all([
    getUserStats(days),
    getSelarClicks(days),
    getInteractionsByType(days),
    getTopContent('view', 5),
    getTopContent('unlock', 5),
    getContentByType(),
    getEngagementDepth(days),
    getReturningMemberRate(days),
    getMostDiscussed(5),
    getAiSummaryRate(days),
    getSelarClicksBreakdown(5),
    getContentPerformanceTable(),
  ])

  const activationRate = userStats.total > 0
    ? Math.round((interactionTypes['unlock'] ?? 0) / userStats.total * 100)
    : 0

  const engagementRate = userStats.activeUsers7d > 0
    ? Math.round(engagementDepth.engagedCount / Math.max(userStats.activeUsers7d, 1) * 100)
    : 0

  const typeBreakdown = Object.entries(contentByType).map(([type, count]) => ({ type, count }))

  return (
    <ProductClient
      data={{
        days,
        community: {
          totalMembers: userStats.total,
          activeMembers7d: userStats.activeUsers7d,
          newMembers: userStats.newUsers,
          selarClicks30d: selarClicks.window,
          engagementRate,
          returningMemberRate: returningRate.rate,
        },
        engagement: {
          activationRate,
          avgDepth: engagementDepth.avgDepth,
          engagedUserPct: userStats.total > 0
            ? Math.round(engagementDepth.engagedCount / userStats.total * 100)
            : 0,
          aiSummaryRate: aiSummaryRate.rate,
        },
        content: {
          topViewed,
          topUnlocked,
          typeBreakdown,
          mostDiscussed,
          topSelarClicks: selarClicksBreakdown,
        },
        contentPerformance,
      }}
    />
  )
}
