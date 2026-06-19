import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRow } from '@/types/database'
import {
  getUserStats, getRevenueStats, getInteractionsByType, getTopContent,
  getContentByType, getRevenueBreakdown, daysAgo, type Days,
} from '@/lib/analytics/queries'
import { ProductClient } from './client'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (p as Pick<UserRow, 'role'> | null)?.role
  if (role !== 'admin' && role !== 'super_admin') redirect('/dashboard')
  return { supabase, role: role! }
}

interface PageProps {
  searchParams: Promise<{ days?: string }>
}

export default async function ProductAnalyticsPage({ searchParams }: PageProps) {
  const { days: daysParam } = await searchParams
  const days = ([7, 14, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30) as Days

  const { supabase, role } = await requireAdmin()
  const isSuperAdmin = role === 'super_admin'

  const [
    userStats,
    revenueStats,
    interactionTypes,
    topViewed,
    topUnlocked,
    topPurchased,
    contentByType,
    userInteractionsRes,
    purchasesByUserRes,
    zeroActivityRes,
    repeatBuyersRes,
  ] = await Promise.all([
    getUserStats(days),
    getRevenueStats(days),
    getInteractionsByType(days),
    getTopContent('view', 5),
    getTopContent('unlock', 5),
    getTopContent('purchase', 5),
    getContentByType(),
    // interactions per user
    supabase.from('content_interactions')
      .select('user_id')
      .not('user_id', 'is', null)
      .gte('created_at', daysAgo(days)),
    // purchases per user
    supabase.from('purchases')
      .select('user_id, amount')
      .eq('status', 'completed'),
    // users with zero interactions
    supabase.from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .not('id', 'in', `(select distinct user_id from content_interactions where user_id is not null)`),
    // repeat buyers
    supabase.from('purchases')
      .select('user_id')
      .eq('status', 'completed'),
  ])

  // Avg unlocks per user
  const unlocksByUser = new Map<string, number>()
  for (const r of (userInteractionsRes.data ?? []) as Array<{ user_id: string }>) {
    unlocksByUser.set(r.user_id, (unlocksByUser.get(r.user_id) ?? 0) + 1)
  }
  const avgInteractionsPerUser = unlocksByUser.size > 0
    ? Math.round(Array.from(unlocksByUser.values()).reduce((s, v) => s + v, 0) / unlocksByUser.size * 10) / 10
    : 0
  const engagedUsers = Array.from(unlocksByUser.values()).filter(v => v >= 3).length

  // Purchase stats
  const buyerMap = new Map<string, number>()
  for (const r of (purchasesByUserRes.data ?? []) as Array<{ user_id: string; amount: number }>) {
    buyerMap.set(r.user_id, (buyerMap.get(r.user_id) ?? 0) + 1)
  }
  const repeatBuyers = Array.from(buyerMap.values()).filter(v => v > 1).length
  const avgOrderValue = revenueStats.transactionCount > 0
    ? Math.round(revenueStats.totalRevenue / revenueStats.transactionCount / 100)
    : 0
  const repeatBuyerPct = buyerMap.size > 0 ? Math.round(repeatBuyers / buyerMap.size * 100) : 0

  // Conversion rates
  const activationRate = userStats.total > 0
    ? Math.round((interactionTypes['unlock'] ?? 0) / userStats.total * 100)
    : 0
  const purchaseRate = userStats.total > 0
    ? Math.round(buyerMap.size / userStats.total * 100)
    : 0
  const arpu = userStats.total > 0
    ? Math.round(revenueStats.totalRevenue / userStats.total / 100)
    : 0

  // Content type breakdown
  const typeBreakdown = Object.entries(contentByType).map(([type, count]) => ({ type, count }))

  // Revenue intelligence (super_admin only)
  const revenueBreakdown = isSuperAdmin ? await getRevenueBreakdown() : null

  // Top revenue content
  const topRevenueContent = isSuperAdmin
    ? await (async () => {
        const { data } = await supabase
          .from('purchases')
          .select('content_id, amount, content:content_id(title, type)')
          .eq('status', 'completed')
        const map = new Map<string, { title: string; type: string; revenue: number; count: number }>()
        for (const r of ((data as unknown[]) ?? []) as Array<{ content_id: string; amount: number; content: { title: string; type: string } | null }>) {
          if (!r.content) continue
          const e = map.get(r.content_id) ?? { ...r.content, revenue: 0, count: 0 }
          e.revenue += r.amount; e.count++
          map.set(r.content_id, e)
        }
        return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
      })()
    : null

  const payload = {
    days, isSuperAdmin,
    business: {
      totalUsers: userStats.total,
      activeUsers7d: userStats.activeUsers7d,
      newUsers: userStats.newUsers,
      totalRevenue: revenueStats.totalRevenue,
      windowRevenue: revenueStats.windowRevenue,
      conversionRate: purchaseRate,
      arpu,
    },
    growth: { activationRate, purchaseRate, repeatBuyerPct },
    content: { topViewed, topUnlocked, topPurchased, typeBreakdown },
    userBehavior: {
      avgInteractionsPerUser,
      engagedUserPct: userStats.total > 0 ? Math.round(engagedUsers / userStats.total * 100) : 0,
      avgOrderValue,
    },
    revenueIntel: isSuperAdmin ? {
      avgOrderValue,
      repeatBuyerPct,
      byCountry: revenueBreakdown?.byCountry ?? [],
      byRole: revenueBreakdown?.byRole ?? [],
      topContent: topRevenueContent ?? [],
    } : null,
  }

  return <ProductClient data={payload} />
}
