import type { SupabaseClient } from '@supabase/supabase-js'
import { daysAgo } from './queries'

// Epic J §J.1-J.4 — ONE cohort-tagging mechanism and ONE cohort-scoped
// analytics view, reused by Cohort Zero/A/B/C rather than three separate
// builds (the prompt's own instruction). Every number here is a real
// query against cohort_memberships joined to the same tables Build
// Prompt 9's analytics layer already reads — nothing is duplicated,
// nothing is fabricated. Cohort membership itself is never seeded here;
// see the migration comment on cohort_memberships/cohort_invites.

export type Cohort = 'zero' | 'a' | 'b' | 'c'

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 1000) / 10
}

export interface CohortMember {
  userId: string
  email: string
  fullName: string | null
  assignedAt: string
}

export async function getCohortMembers(service: SupabaseClient, cohort: Cohort): Promise<CohortMember[]> {
  const { data } = await service
    .from('cohort_memberships')
    .select('assigned_at, user:users(id, email, full_name)')
    .eq('cohort', cohort)
    .order('assigned_at', { ascending: false })

  type Row = { assigned_at: string; user: { id: string; email: string; full_name: string | null } | null }
  return ((data ?? []) as unknown as Row[])
    .filter((r): r is Row & { user: NonNullable<Row['user']> } => !!r.user)
    .map(r => ({ userId: r.user.id, email: r.user.email, fullName: r.user.full_name, assignedAt: r.assigned_at }))
}

export interface CohortMetrics {
  totalMembers: number
  // Cohort A — functional QA
  signedUp: number
  onboardingCompletionRate: number
  feedbackCount: number
  dashboardViewers: number
  resourceOpeners: number
  mobileUsers: number
  webUsers: number
  learningPathStarts: number
  leaderboardRanked: number
  aiFeatureUsers: number
  // Cohort B — learning/engagement validation
  activatedUsers: number
  contentDiscoveryEvents: number // search_performed count from this cohort
  learningPathCompletions: number
  day7Retention: number
  recommendationClicks: number
  // Cohort C — launch simulation
  emailDeliveredCount: number
  pushDeliveredCount: number
  searchZeroResultCount: number
  communityContributionCount: number
}

/**
 * One function, real numbers for every category §J.2/J.3/J.4 ask for —
 * which subset matters depends on which cohort you're looking at, but
 * there's no value in three near-identical functions that would drift
 * out of sync with each other.
 */
export async function getCohortMetrics(service: SupabaseClient, cohort: Cohort): Promise<CohortMetrics> {
  const members = await getCohortMembers(service, cohort)
  const userIds = members.map(m => m.userId)
  const totalMembers = userIds.length

  if (totalMembers === 0) {
    return {
      totalMembers: 0, signedUp: 0, onboardingCompletionRate: 0, feedbackCount: 0,
      dashboardViewers: 0, resourceOpeners: 0, mobileUsers: 0, webUsers: 0,
      learningPathStarts: 0, leaderboardRanked: 0, aiFeatureUsers: 0,
      activatedUsers: 0, contentDiscoveryEvents: 0, learningPathCompletions: 0,
      day7Retention: 0, recommendationClicks: 0, emailDeliveredCount: 0,
      pushDeliveredCount: 0, searchZeroResultCount: 0, communityContributionCount: 0,
    }
  }

  const [
    usersRes, feedbackRes, dashboardRes, contentOpenedRes, sourceRes,
    pathStartsRes, leaderboardRes, aiRes, contentProgressRes, searchRes,
    pathCompletionsRes, recClickRes, digestDeliveredRes, pushSentRes,
    searchZeroRes, contributionRes,
  ] = await Promise.all([
    service.from('users').select('id, onboarding_done, created_at').in('id', userIds),
    service.from('feedback').select('id', { count: 'exact', head: true }).in('user_id', userIds),
    service.from('analytics_events').select('user_id').eq('event_name', 'dashboard_viewed').in('user_id', userIds),
    service.from('analytics_events').select('user_id').eq('event_name', 'content_opened').in('user_id', userIds),
    service.from('analytics_events').select('user_id, source').in('user_id', userIds),
    service.from('user_learning_paths').select('user_id', { count: 'exact', head: true }).in('user_id', userIds),
    service.from('leaderboard_scores').select('user_id', { count: 'exact', head: true }).in('user_id', userIds),
    service.from('ai_interactions').select('user_id').in('user_id', userIds),
    service.from('content_progress').select('user_id, status').in('user_id', userIds),
    service.from('analytics_events').select('user_id').eq('event_name', 'search_performed').in('user_id', userIds),
    service.from('user_learning_paths').select('user_id', { count: 'exact', head: true }).in('user_id', userIds).not('completed_at', 'is', null),
    service.from('analytics_events').select('user_id', { count: 'exact', head: true }).eq('event_name', 'ai_recommendation_clicked').in('user_id', userIds),
    service.from('digest_recipients').select('user_id', { count: 'exact', head: true }).in('user_id', userIds).not('delivered_at', 'is', null),
    service.from('analytics_events').select('user_id', { count: 'exact', head: true }).eq('event_name', 'push_notification_sent').in('user_id', userIds),
    service.from('analytics_events').select('user_id', { count: 'exact', head: true }).eq('event_name', 'search_zero_results').in('user_id', userIds),
    service.from('contribution_events').select('user_id', { count: 'exact', head: true }).in('user_id', userIds),
  ])

  const users = (usersRes.data ?? []) as Array<{ id: string; onboarding_done: boolean; created_at: string }>
  const onboardedCount = users.filter(u => u.onboarding_done).length

  const uniq = (rows: Array<{ user_id: string | null }> | null) => new Set((rows ?? []).map(r => r.user_id).filter(Boolean)).size

  const sourceRows = (sourceRes.data ?? []) as Array<{ user_id: string | null; source: string }>
  const mobileUsers = new Set(sourceRows.filter(r => r.source === 'mobile' && r.user_id).map(r => r.user_id)).size
  const webUsers = new Set(sourceRows.filter(r => r.source === 'web' && r.user_id).map(r => r.user_id)).size

  const progressRows = (contentProgressRes.data ?? []) as Array<{ user_id: string; status: string }>
  const completedIds = new Set(progressRows.filter(p => p.status === 'completed').map(p => p.user_id))
  const openedIds = new Set(((contentOpenedRes.data ?? []) as Array<{ user_id: string }>).map(r => r.user_id))
  // Activated: same real-action definition spirit as §H.4 — onboarded, opened something, completed something.
  const activatedUsers = users.filter(u => u.onboarding_done && openedIds.has(u.id) && completedIds.has(u.id)).length

  // Day-7 retention within this cohort — cohort members who signed up
  // more than 7 days ago and have any analytics_events activity 7+ days
  // after signup. Same definition as §H.7's getRetentionRate, scoped.
  const eligibleForRetention = users.filter(u => new Date(u.created_at) <= new Date(daysAgo(7)))
  let retained = 0
  if (eligibleForRetention.length > 0) {
    const { data: events } = await service.from('analytics_events').select('user_id, created_at').in('user_id', eligibleForRetention.map(u => u.id))
    const byUser = new Map<string, string[]>()
    for (const e of (events ?? []) as Array<{ user_id: string; created_at: string }>) {
      const arr = byUser.get(e.user_id) ?? []
      arr.push(e.created_at)
      byUser.set(e.user_id, arr)
    }
    for (const u of eligibleForRetention) {
      const signup = new Date(u.created_at)
      const windowStart = new Date(signup.getTime() + 7 * 86400000)
      const windowEnd = new Date(windowStart.getTime() + 86400000)
      const hits = byUser.get(u.id) ?? []
      if (hits.some(ts => { const t = new Date(ts); return t >= windowStart && t < windowEnd })) retained++
    }
  }

  return {
    totalMembers,
    signedUp: users.length,
    onboardingCompletionRate: pct(onboardedCount, users.length),
    feedbackCount: feedbackRes.count ?? 0,
    dashboardViewers: uniq(dashboardRes.data as never),
    resourceOpeners: openedIds.size,
    mobileUsers,
    webUsers,
    learningPathStarts: pathStartsRes.count ?? 0,
    leaderboardRanked: leaderboardRes.count ?? 0,
    aiFeatureUsers: uniq(aiRes.data as never),
    activatedUsers,
    contentDiscoveryEvents: uniq(searchRes.data as never),
    learningPathCompletions: pathCompletionsRes.count ?? 0,
    day7Retention: pct(retained, eligibleForRetention.length),
    recommendationClicks: recClickRes.count ?? 0,
    emailDeliveredCount: digestDeliveredRes.count ?? 0,
    pushDeliveredCount: pushSentRes.count ?? 0,
    searchZeroResultCount: searchZeroRes.count ?? 0,
    communityContributionCount: contributionRes.count ?? 0,
  }
}
