// Epic H (Build Prompt 9) — the shared analytics calculation layer §H.3
// asks for: every rate, the activation flag, Weekly Engaged Learners, the
// product funnel, and the §H.7 supporting metrics all live here, computed
// once, so every admin view reads the same numbers instead of each page
// recomputing its own version. Every function queries real tables —
// analytics_events, content_progress, content_favorites, content_comments,
// content_interactions, ratings, module_progress, exercise_responses,
// user_learning_paths — nothing here is mocked or estimated.
import { createServiceClient } from './supabase/server'
import { daysAgo, type Days } from './queries'

// ============================================================
// §H.3 — Content rate calculations
// ============================================================

export interface ContentRates {
  contentId: string
  impressions: number
  uniqueOpens: number
  readerOpens: number
  completions: number
  favorites: number
  downloads: number
  shares: number
  comments: number
  ratingsCount: number
  averageRating: number | null
  aiInteractions: number
  listenStarts: number
  listenCompletions: number
  relatedClicks: number
  completionRate: number   // Completed / Opened × 100
  saveRate: number         // Favorites / Unique Opens × 100
  downloadRate: number     // Downloads / Unique Opens × 100
  shareRate: number        // Shares / Unique Opens × 100
  readRate: number         // Reader Opens / Resource Views × 100
  engagementRate: number   // Meaningful actions / Unique Opens × 100
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 1000) / 10
}

/**
 * Real per-content rates for every published content row, in one pass.
 * Used by the admin Content Analytics table (§H.9) — never recomputed
 * per-row, and never inline in a page component.
 */
export async function getContentRatesTable(): Promise<ContentRates[]> {
  const service = createServiceClient()

  const [
    contentRes, eventsRes, progressRes, favoritesRes, interactionsRes,
    commentsRes, ratingsRes, aiRes, legacyViewsRes,
  ] = await Promise.all([
    service.from('content').select('id, status').eq('status', 'published'),
    service.from('analytics_events').select('event_name, content_id, user_id')
      .in('event_name', ['content_impression', 'content_opened', 'reader_opened', 'listen_started', 'listen_completed', 'related_content_clicked'])
      .not('content_id', 'is', null),
    service.from('content_progress').select('content_id, status'),
    service.from('content_favorites').select('content_id'),
    service.from('content_interactions').select('content_id, type').in('type', ['download', 'share']),
    service.from('content_comments').select('content_id').eq('is_deleted', false),
    service.from('ratings').select('content_id, rating'),
    service.from('ai_interactions').select('input_context'),
    // The long-standing content_interactions 'view' row (present since
    // Build Prompt 1/3) — unioned into uniqueOpens alongside the brand-new
    // content_opened event. The new event alone undercounts by orders of
    // magnitude for anything opened before this epic shipped it, which
    // produced >100% rates during live verification (downloads/favorites
    // accumulated for months against a denominator only days old).
    service.from('content_interactions').select('content_id, user_id').eq('type', 'view').not('user_id', 'is', null),
  ])

  const contentIds = (contentRes.data ?? []).map(c => c.id)
  const byId = new Map<string, ContentRates>(contentIds.map(id => [id, {
    contentId: id, impressions: 0, uniqueOpens: 0, readerOpens: 0, completions: 0,
    favorites: 0, downloads: 0, shares: 0, comments: 0, ratingsCount: 0, averageRating: null,
    aiInteractions: 0, listenStarts: 0, listenCompletions: 0, relatedClicks: 0,
    completionRate: 0, saveRate: 0, downloadRate: 0, shareRate: 0, readRate: 0, engagementRate: 0,
  }]))

  const uniqueOpeners = new Map<string, Set<string>>()

  for (const e of (eventsRes.data ?? []) as Array<{ event_name: string; content_id: string; user_id: string | null }>) {
    const row = byId.get(e.content_id)
    if (!row) continue
    if (e.event_name === 'content_impression') row.impressions++
    if (e.event_name === 'content_opened') {
      const set = uniqueOpeners.get(e.content_id) ?? new Set<string>()
      if (e.user_id) set.add(e.user_id)
      uniqueOpeners.set(e.content_id, set)
    }
    if (e.event_name === 'reader_opened') row.readerOpens++
    if (e.event_name === 'listen_started') row.listenStarts++
    if (e.event_name === 'listen_completed') row.listenCompletions++
    if (e.event_name === 'related_content_clicked') row.relatedClicks++
  }
  for (const v of (legacyViewsRes.data ?? []) as Array<{ content_id: string; user_id: string }>) {
    const set = uniqueOpeners.get(v.content_id) ?? new Set<string>()
    set.add(v.user_id)
    uniqueOpeners.set(v.content_id, set)
  }
  for (const [id, set] of uniqueOpeners) {
    const row = byId.get(id)
    if (row) row.uniqueOpens = set.size
  }

  for (const p of (progressRes.data ?? []) as Array<{ content_id: string; status: string }>) {
    if (p.status !== 'completed') continue
    const row = byId.get(p.content_id)
    if (row) row.completions++
  }

  for (const f of (favoritesRes.data ?? []) as Array<{ content_id: string }>) {
    const row = byId.get(f.content_id); if (row) row.favorites++
  }
  for (const i of (interactionsRes.data ?? []) as Array<{ content_id: string; type: string }>) {
    const row = byId.get(i.content_id); if (!row) continue
    if (i.type === 'download') row.downloads++
    if (i.type === 'share') row.shares++
  }
  for (const c of (commentsRes.data ?? []) as Array<{ content_id: string }>) {
    const row = byId.get(c.content_id); if (row) row.comments++
  }
  const ratingSums = new Map<string, { sum: number; count: number }>()
  for (const r of (ratingsRes.data ?? []) as Array<{ content_id: string; rating: number }>) {
    const row = byId.get(r.content_id); if (!row) continue
    row.ratingsCount++
    const agg = ratingSums.get(r.content_id) ?? { sum: 0, count: 0 }
    agg.sum += r.rating; agg.count++
    ratingSums.set(r.content_id, agg)
  }
  for (const [id, agg] of ratingSums) {
    const row = byId.get(id)
    if (row) row.averageRating = Math.round((agg.sum / agg.count) * 10) / 10
  }
  for (const a of (aiRes.data ?? []) as Array<{ input_context: Record<string, unknown> }>) {
    const cid = a.input_context?.contentId as string | undefined
    if (cid) { const row = byId.get(cid); if (row) row.aiInteractions++ }
  }

  for (const row of byId.values()) {
    row.completionRate = pct(row.completions, row.uniqueOpens)
    row.saveRate = pct(row.favorites, row.uniqueOpens)
    row.downloadRate = pct(row.downloads, row.uniqueOpens)
    row.shareRate = pct(row.shares, row.uniqueOpens)
    // Read Rate = Reader Opens / Resource Views — "views" here is the
    // impression count (a page/resource view), falling back to unique
    // opens for content types that don't emit a separate impression.
    row.readRate = pct(row.readerOpens, row.impressions || row.uniqueOpens)
    const meaningfulActions = row.completions + row.favorites + row.comments + row.downloads + row.shares + row.ratingsCount
    row.engagementRate = pct(meaningfulActions, row.uniqueOpens)
  }

  return Array.from(byId.values())
}

// ============================================================
// §H.4 — Activation
// ============================================================
// A signup is not an activation. Real, queryable definition:
//   onboarding_done = true
//   AND at least one resource meaningfully consumed (opened/read something)
//   AND at least one meaningful action completed (save, complete, download,
//       comment, start a learning path, complete an exercise)
// Computed fresh from real tables every call — not a stored flag that can
// drift from the definition. If the definition needs a fast index later,
// this is the one function to promote into a materialized view; nothing
// else duplicates this logic.

export interface ActivationStats {
  totalUsers: number
  activatedUsers: number
  activationRate: number
}

export async function getActivationStats(): Promise<ActivationStats> {
  const service = createServiceClient()

  const [usersRes, openedRes, progressRes, favoritesRes, downloadsRes, commentsRes, pathsRes, exercisesRes] = await Promise.all([
    service.from('users').select('id, onboarding_done').eq('role', 'user'),
    service.from('analytics_events').select('user_id').eq('event_name', 'content_opened').not('user_id', 'is', null),
    service.from('content_progress').select('user_id, status'),
    service.from('content_favorites').select('user_id'),
    service.from('content_interactions').select('user_id').eq('type', 'download').not('user_id', 'is', null),
    service.from('content_comments').select('user_id').eq('is_deleted', false),
    service.from('user_learning_paths').select('user_id'),
    service.from('exercise_responses').select('user_id'),
  ])

  const onboardedIds = new Set((usersRes.data ?? []).filter(u => u.onboarding_done).map(u => u.id))
  const consumedIds = new Set((openedRes.data ?? []).map(r => r.user_id as string))
  for (const p of (progressRes.data ?? []) as Array<{ user_id: string }>) consumedIds.add(p.user_id)

  const meaningfulActionIds = new Set<string>()
  for (const f of (favoritesRes.data ?? []) as Array<{ user_id: string }>) meaningfulActionIds.add(f.user_id)
  for (const p of (progressRes.data ?? []) as Array<{ user_id: string; status: string }>) if (p.status === 'completed') meaningfulActionIds.add(p.user_id)
  for (const d of (downloadsRes.data ?? []) as Array<{ user_id: string }>) meaningfulActionIds.add(d.user_id)
  for (const c of (commentsRes.data ?? []) as Array<{ user_id: string }>) meaningfulActionIds.add(c.user_id)
  for (const p of (pathsRes.data ?? []) as Array<{ user_id: string }>) meaningfulActionIds.add(p.user_id)
  for (const e of (exercisesRes.data ?? []) as Array<{ user_id: string }>) meaningfulActionIds.add(e.user_id)

  let activatedUsers = 0
  for (const id of onboardedIds) {
    if (consumedIds.has(id) && meaningfulActionIds.has(id)) activatedUsers++
  }

  const totalUsers = (usersRes.data ?? []).length
  return { totalUsers, activatedUsers, activationRate: pct(activatedUsers, totalUsers) }
}

// ============================================================
// §H.6 — North Star: Weekly Engaged Learners
// ============================================================
// Unique members completing at least TWO meaningful learning activities
// within a rolling 7-day period, computed from "now" every call — a real
// rolling window, not a static Monday-snapshot job that drifts from the
// definition over the week. Meaningful learning activity here is narrower
// than activation's "meaningful action": completing content, completing a
// module, completing an exercise, or completing a learning path — the
// learning-specific subset, not saves/downloads which are engagement but
// not learning completion.

export async function getWeeklyEngagedLearners(): Promise<number> {
  const service = createServiceClient()
  const since = daysAgo(7)

  const [contentRes, moduleRes, exerciseRes, pathRes] = await Promise.all([
    service.from('content_progress').select('user_id, completed_at').eq('status', 'completed').gte('completed_at', since),
    service.from('module_progress').select('user_id, completed_at').eq('status', 'completed').gte('completed_at', since),
    service.from('exercise_responses').select('user_id, created_at').gte('created_at', since),
    service.from('user_learning_paths').select('user_id, completed_at').not('completed_at', 'is', null).gte('completed_at', since),
  ])

  const activityCount = new Map<string, number>()
  const bump = (id: string) => activityCount.set(id, (activityCount.get(id) ?? 0) + 1)
  for (const r of (contentRes.data ?? []) as Array<{ user_id: string }>) bump(r.user_id)
  for (const r of (moduleRes.data ?? []) as Array<{ user_id: string }>) bump(r.user_id)
  for (const r of (exerciseRes.data ?? []) as Array<{ user_id: string }>) bump(r.user_id)
  for (const r of (pathRes.data ?? []) as Array<{ user_id: string }>) bump(r.user_id)

  let wel = 0
  for (const count of activityCount.values()) if (count >= 2) wel++
  return wel
}

// ============================================================
// §H.5 — Product funnel
// ============================================================

export interface FunnelStage { label: string; count: number }

export async function getProductFunnel(days: Days = 30): Promise<FunnelStage[]> {
  const service = createServiceClient()
  const since = daysAgo(days)

  const [
    visitorsRes, signupStartedRes, signupCompletedRes, emailVerifiedRes,
    onboardingStartedRes, onboardingCompletedRes, firstOpenRes,
    activation, secondSessionRes, pathStartedRes, wel, activeLast7Res,
    olderSignupsRes, contributorRes,
  ] = await Promise.all([
    service.from('content_interactions').select('session_id, user_id').eq('type', 'view').gte('created_at', since),
    service.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_name', 'signup_started').gte('created_at', since),
    service.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_name', 'signup_completed').gte('created_at', since),
    service.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_name', 'email_verified').gte('created_at', since),
    service.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_name', 'onboarding_started').gte('created_at', since),
    service.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_name', 'onboarding_completed').gte('created_at', since),
    service.from('analytics_events').select('user_id').eq('event_name', 'content_opened').not('user_id', 'is', null).gte('created_at', since),
    getActivationStats(),
    service.from('analytics_events').select('user_id, created_at').eq('event_name', 'dashboard_viewed').not('user_id', 'is', null).gte('created_at', since),
    service.from('user_learning_paths').select('user_id', { count: 'exact', head: true }).gte('started_at', since),
    getWeeklyEngagedLearners(),
    // "Retained Learner (7d)" — real returning-user count: active (any
    // analytics_events) in the last 7 days AND signed up more than 7 days
    // ago, so a brand-new signup being trivially active this week doesn't
    // count as "retained." Found live during this sweep: the prior version
    // read contribution_events, which measures weekly contributors, not
    // retention — a real-data-but-wrong-metric bug, distinct from this
    // page's separate cohort-based "Day 7 retention" supporting metric.
    service.from('analytics_events').select('user_id').not('user_id', 'is', null).gte('created_at', daysAgo(7)),
    service.from('users').select('id').eq('role', 'user').lte('created_at', daysAgo(7)),
    // "Contributor" — distinct contributing users, not a raw contribution_events
    // row count. Found live during this sweep: a head-count query returns
    // total events (one user contributing 12 times over 30 days showed as
    // "12 Contributors"), which broke the funnel's narrowing shape outright
    // (this stage exceeded every stage above it).
    service.from('contribution_events').select('user_id').gte('created_at', since),
  ])

  const visitorSet = new Set<string>()
  for (const r of (visitorsRes.data ?? []) as Array<{ session_id: string | null; user_id: string | null }>) {
    visitorSet.add(r.user_id ?? r.session_id ?? 'anon')
  }
  const firstOpenSet = new Set((firstOpenRes.data ?? []).map(r => r.user_id as string))

  // "Second session" — a user with dashboard_viewed on two distinct days.
  const sessionDays = new Map<string, Set<string>>()
  for (const r of (secondSessionRes.data ?? []) as Array<{ user_id: string; created_at: string }>) {
    const set = sessionDays.get(r.user_id) ?? new Set<string>()
    set.add(r.created_at.slice(0, 10))
    sessionDays.set(r.user_id, set)
  }
  const secondSessionCount = Array.from(sessionDays.values()).filter(s => s.size >= 2).length

  const olderSignupIds = new Set((olderSignupsRes.data ?? []).map(r => r.id as string))
  const retainedLearnerCount = new Set(
    ((activeLast7Res.data ?? []) as Array<{ user_id: string }>)
      .map(r => r.user_id)
      .filter(id => olderSignupIds.has(id))
  ).size

  const contributorCount = new Set((contributorRes.data ?? []).map(r => r.user_id as string)).size

  return [
    { label: 'Visitor', count: visitorSet.size },
    { label: 'Signup Started', count: signupStartedRes.count ?? 0 },
    { label: 'Signup Completed', count: signupCompletedRes.count ?? 0 },
    { label: 'Email Verified', count: emailVerifiedRes.count ?? 0 },
    { label: 'Onboarding Started', count: onboardingStartedRes.count ?? 0 },
    { label: 'Onboarding Completed', count: onboardingCompletedRes.count ?? 0 },
    { label: 'First Content Open', count: firstOpenSet.size },
    { label: 'First Meaningful Activity', count: activation.activatedUsers },
    { label: 'Activated User', count: activation.activatedUsers },
    { label: 'Second Session', count: secondSessionCount },
    { label: 'Learning Path Started', count: pathStartedRes.count ?? 0 },
    { label: 'Weekly Active Learner', count: wel },
    { label: 'Retained Learner (7d)', count: retainedLearnerCount },
    { label: 'Contributor', count: contributorCount },
    { label: 'Advocate', count: 0 }, // no referral/advocacy mechanism exists yet — honest zero, not fabricated
  ]
}

// ============================================================
// §H.7 — Supporting metrics
// ============================================================

export interface SupportingMetrics {
  signupConversion: number         // signup_completed / signup_started × 100
  emailVerificationRate: number    // email_verified / signup_completed × 100
  onboardingCompletionRate: number // onboarding_completed / onboarding_started × 100
  activationRate: number
  day1Return: number                // % of new users with any activity 1 day after signup
  day7Retention: number
  day30Retention: number
  wau: number
  mau: number
  wauOverMau: number                // ratio, 0-1
  resourceCompletionRate: number
  saveRate: number
  downloadRate: number
  learningPathStartCount: number
  learningPathCompletionRate: number
  exerciseCompletionCount: number
  recommendationCtr: number         // ai_recommendation_clicked / ai_recommendation_shown × 100
  aiFeatureUsageCount: number
  communityContributionCount: number
  digestCtr: null                   // Epic J hasn't shipped the digest yet — honestly not-yet-applicable, not a fabricated 0% or 100%
}

async function getRetentionRate(service: ReturnType<typeof createServiceClient>, dayOffset: number): Promise<number> {
  // Cohort: users who signed up more than `dayOffset` days ago (so the
  // window has actually elapsed), checked for any analytics_events row on
  // day `dayOffset` after their signup date.
  const cohortCutoff = daysAgo(dayOffset)
  const { data: cohort } = await service.from('users').select('id, created_at').eq('role', 'user').lte('created_at', cohortCutoff)
  const rows = (cohort ?? []) as Array<{ id: string; created_at: string }>
  if (rows.length === 0) return 0

  const { data: events } = await service.from('analytics_events').select('user_id, created_at').in('user_id', rows.map(r => r.id))
  const activityByUser = new Map<string, string[]>()
  for (const e of (events ?? []) as Array<{ user_id: string; created_at: string }>) {
    const arr = activityByUser.get(e.user_id) ?? []
    arr.push(e.created_at)
    activityByUser.set(e.user_id, arr)
  }

  let retained = 0
  for (const u of rows) {
    const signupDate = new Date(u.created_at)
    const targetDay = new Date(signupDate.getTime() + dayOffset * 86400000)
    const windowStart = targetDay
    const windowEnd = new Date(targetDay.getTime() + 86400000)
    const hits = activityByUser.get(u.id) ?? []
    if (hits.some(ts => { const t = new Date(ts); return t >= windowStart && t < windowEnd })) retained++
  }
  return pct(retained, rows.length)
}

export async function getSupportingMetrics(): Promise<SupportingMetrics> {
  const service = createServiceClient()
  const since7 = daysAgo(7)
  const since30 = daysAgo(30)

  const [
    signupStarted, signupCompleted, emailVerified, onboardingStarted, onboardingCompleted,
    activation, wauUsers, mauUsers, contentProgress, favorites, downloads, uniqueOpensRes,
    pathsStarted, pathsCompleted, exercises, recShown, recClicked, aiInteractions, contributions,
    day1, day7, day30,
  ] = await Promise.all([
    service.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_name', 'signup_started'),
    service.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_name', 'signup_completed'),
    service.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_name', 'email_verified'),
    service.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_name', 'onboarding_started'),
    service.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_name', 'onboarding_completed'),
    getActivationStats(),
    service.from('analytics_events').select('user_id').not('user_id', 'is', null).gte('created_at', since7),
    service.from('analytics_events').select('user_id').not('user_id', 'is', null).gte('created_at', since30),
    service.from('content_progress').select('status'),
    service.from('content_favorites').select('id', { count: 'exact', head: true }),
    service.from('content_interactions').select('id', { count: 'exact', head: true }).eq('type', 'download'),
    // "Unique opens" for this GLOBAL rate deliberately reads the long-standing
    // content_interactions 'view' row (present since Build Prompt 1/3) rather
    // than the brand-new analytics_events content_opened event added this
    // epic — the new event only started getting real data days ago on
    // ebook/template pages, so it undercounts historical opens by orders of
    // magnitude against downloads/favorites that have been accumulating for
    // months. Found live: this exact mismatch produced a >7000% "rate"
    // before the fix. Per-content rates (getContentRatesTable) correctly
    // use the new event since they're scoped to each item's own history.
    service.from('content_interactions').select('user_id, content_id').eq('type', 'view').not('user_id', 'is', null),
    service.from('user_learning_paths').select('id', { count: 'exact', head: true }),
    service.from('user_learning_paths').select('completed_at'),
    service.from('exercise_responses').select('id', { count: 'exact', head: true }),
    service.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_name', 'ai_recommendation_shown'),
    service.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_name', 'ai_recommendation_clicked'),
    service.from('ai_interactions').select('id', { count: 'exact', head: true }),
    service.from('contribution_events').select('id', { count: 'exact', head: true }),
    getRetentionRate(service, 1),
    getRetentionRate(service, 7),
    getRetentionRate(service, 30),
  ])

  const wau = new Set((wauUsers.data ?? []).map(r => r.user_id as string)).size
  const mau = new Set((mauUsers.data ?? []).map(r => r.user_id as string)).size

  const progressRows = (contentProgress.data ?? []) as Array<{ status: string }>
  const resourceCompletionRate = pct(progressRows.filter(p => p.status === 'completed').length, progressRows.length)

  // Real "Unique Opens" denominator for save/download rate — distinct
  // (user, content) pairs from content_opened, matching the same §H.3
  // definition getContentRatesTable() uses per item. Using content_progress
  // row count here was wrong (a much smaller, unrelated number) and
  // produced a >100% "rate", caught during live verification.
  const uniqueOpenPairs = new Set(
    ((uniqueOpensRes.data ?? []) as Array<{ user_id: string | null; content_id: string }>)
      .filter(r => r.user_id)
      .map(r => `${r.user_id}:${r.content_id}`)
  )
  const totalUniqueOpens = uniqueOpenPairs.size

  const pathsCompletedCount = ((pathsCompleted.data ?? []) as Array<{ completed_at: string | null }>).filter(p => p.completed_at).length

  return {
    signupConversion: pct(signupCompleted.count ?? 0, signupStarted.count ?? 0),
    emailVerificationRate: pct(emailVerified.count ?? 0, signupCompleted.count ?? 0),
    onboardingCompletionRate: pct(onboardingCompleted.count ?? 0, onboardingStarted.count ?? 0),
    activationRate: activation.activationRate,
    day1Return: day1,
    day7Retention: day7,
    day30Retention: day30,
    wau,
    mau,
    wauOverMau: mau > 0 ? Math.round((wau / mau) * 100) / 100 : 0,
    resourceCompletionRate,
    saveRate: pct(favorites.count ?? 0, totalUniqueOpens),
    downloadRate: pct(downloads.count ?? 0, totalUniqueOpens),
    learningPathStartCount: pathsStarted.count ?? 0,
    learningPathCompletionRate: pct(pathsCompletedCount, pathsStarted.count ?? 0),
    exerciseCompletionCount: exercises.count ?? 0,
    recommendationCtr: pct(recClicked.count ?? 0, recShown.count ?? 0),
    aiFeatureUsageCount: aiInteractions.count ?? 0,
    communityContributionCount: contributions.count ?? 0,
    digestCtr: null,
  }
}
