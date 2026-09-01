import type { SupabaseClient } from '@supabase/supabase-js'

// Epic D: My ProductSlice dashboard + profile data access, shared by web
// and mobile. Same reason this is its own file and not part of queries.ts
// (see recommendations.ts): queries.ts imports './supabase/server'
// (next/headers) at module scope, which breaks Metro bundling the moment
// mobile touches anything from that file. Every function here takes the
// caller's own Supabase client instead.

export interface CommunityPosition {
  rank: number
  score: number
  totalRanked: number
}

/** Real, non-fabricated rank via the get_my_community_position() SQL
 * function (packages/database migration 20260901000028) — the only
 * function that can see cross-user scoring safely from an anon-key
 * client. Returns null for "not yet ranked" (zero qualifying activity),
 * never a fabricated position. */
export async function getCommunityPosition(supabase: SupabaseClient): Promise<CommunityPosition | null> {
  const { data, error } = await supabase.rpc('get_my_community_position')
  if (error || !data || data.length === 0) return null
  const row = data[0] as { rank: number; score: number; total_ranked: number }
  return { rank: row.rank, score: row.score, totalRanked: row.total_ranked }
}

/** Consecutive-day activity streak via get_my_streak(). 0 for a brand-new
 * member — a real number, never a placeholder. */
export async function getStreak(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc('get_my_streak')
  if (error || data == null) return 0
  return data as number
}

export interface PublicProfile {
  id: string
  username: string | null
  fullName: string | null
  avatarUrl: string | null
  headline: string | null
  jobRole: string | null
  company: string | null
  country: string | null
  region: string | null
  experienceLevel: string | null
  yearsExperience: number | null
  bio: string | null
  skills: string[]
  linkedinUrl: string | null
  portfolioUrl: string | null
  websiteUrl: string | null
  githubUrl: string | null
  xUrl: string | null
  privacyTier: string
  topicNames: string[]
  goalNames: string[]
  completedPathsCount: number
  completedResourcesCount: number
  contributionScore: number
  createdAt: string
}

/** /profile/[username] via get_public_profile() — the privacy check
 * (public/community/private) runs inside the DB function, not here, so
 * there's no code path that can accidentally skip it. Returns null for
 * "not found" and "not allowed to view" alike — the page can't tell the
 * difference, which is the point (a private profile shouldn't even reveal
 * that the username exists). */
export async function getPublicProfile(supabase: SupabaseClient, username: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.rpc('get_public_profile', { p_username: username })
  if (error || !data || data.length === 0) return null
  const r = data[0] as {
    id: string; username: string | null; full_name: string | null; avatar_url: string | null; headline: string | null
    job_role: string | null; company: string | null; country: string | null; region: string | null
    experience_level: string | null; years_experience: number | null; bio: string | null; skills: string[] | null
    linkedin_url: string | null; portfolio_url: string | null; website_url: string | null; github_url: string | null; x_url: string | null
    privacy_tier: string; topic_names: string[] | null; goal_names: string[] | null
    completed_paths_count: number; completed_resources_count: number; contribution_score: number
    created_at: string
  }
  return {
    id: r.id, username: r.username, fullName: r.full_name, avatarUrl: r.avatar_url, headline: r.headline,
    jobRole: r.job_role, company: r.company, country: r.country, region: r.region,
    experienceLevel: r.experience_level, yearsExperience: r.years_experience, bio: r.bio, skills: r.skills ?? [],
    linkedinUrl: r.linkedin_url, portfolioUrl: r.portfolio_url, websiteUrl: r.website_url, githubUrl: r.github_url, xUrl: r.x_url,
    privacyTier: r.privacy_tier, topicNames: r.topic_names ?? [], goalNames: r.goal_names ?? [],
    completedPathsCount: r.completed_paths_count, completedResourcesCount: r.completed_resources_count,
    contributionScore: r.contribution_score, createdAt: r.created_at,
  }
}

export interface DashboardContentItem {
  id: string
  title: string
  slug: string
  type: string
  summary: string | null
  coverImageUrl: string | null
  tags: string[]
}

/** Recommended For You (Epic D §D.2) — v1 rules-based stub: score every
 * candidate by tag overlap with the member's topics/goals/role, minus
 * anything they've already completed or favorited. Epic E replaces the
 * body of this function with a real personalization engine later; every
 * call site keeps working unchanged as long as this return shape holds —
 * same contract as getStarterRecommendations above. */
export async function getRecommendedForYou(supabase: SupabaseClient, userId: string, limit = 6): Promise<DashboardContentItem[]> {
  const [topicsRes, goalsRes, roleRes, progressRes, favoritesRes, poolRes] = await Promise.all([
    supabase.from('user_topics').select('topic:topics(name)').eq('user_id', userId),
    supabase.from('user_goals').select('goal:goals(name)').eq('user_id', userId),
    supabase.from('users').select('primary_role_id, roles:primary_role_id(name)').eq('id', userId).maybeSingle(),
    supabase.from('content_progress').select('content_id').eq('user_id', userId).eq('status', 'completed'),
    supabase.from('content_favorites').select('content_id').eq('user_id', userId),
    supabase.from('content').select('id, title, slug, type, summary, cover_image_url, tags')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(60),
  ])

  const labelSet = new Set<string>()
  for (const t of ((topicsRes.data ?? []) as unknown as Array<{ topic: { name: string } | null }>)) {
    if (t.topic?.name) labelSet.add(t.topic.name.toLowerCase())
  }
  for (const g of ((goalsRes.data ?? []) as unknown as Array<{ goal: { name: string } | null }>)) {
    if (g.goal?.name) labelSet.add(g.goal.name.toLowerCase())
  }
  const roleName = (roleRes.data as unknown as { roles: { name: string } | null } | null)?.roles?.name
  if (roleName) labelSet.add(roleName.toLowerCase())

  const excludeIds = new Set([
    ...((progressRes.data ?? []) as Array<{ content_id: string }>).map(r => r.content_id),
    ...((favoritesRes.data ?? []) as Array<{ content_id: string }>).map(r => r.content_id),
  ])

  type Row = { id: string; title: string; slug: string; type: string; summary: string | null; cover_image_url: string | null; tags: string[] | null }
  const pool = ((poolRes.data ?? []) as Row[]).filter(r => !excludeIds.has(r.id))
  const score = (r: Row) => (r.tags ?? []).filter(t => labelSet.has(t.toLowerCase())).length

  return pool
    .map(r => ({ r, s: score(r) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ r }) => ({ id: r.id, title: r.title, slug: r.slug, type: r.type, summary: r.summary, coverImageUrl: r.cover_image_url, tags: r.tags ?? [] }))
}

/** New For You (Epic D §D.2) — distinct from Recommended: newest content
 * matching topics only, no exclusion of already-seen items (the point is
 * "what's new", not "what you haven't tried"), no AI calls. */
export async function getNewForYou(supabase: SupabaseClient, userId: string, limit = 6): Promise<DashboardContentItem[]> {
  const [topicsRes, poolRes] = await Promise.all([
    supabase.from('user_topics').select('topic:topics(name)').eq('user_id', userId),
    supabase.from('content').select('id, title, slug, type, summary, cover_image_url, tags, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(30),
  ])

  const topicNames = new Set(
    ((topicsRes.data ?? []) as unknown as Array<{ topic: { name: string } | null }>)
      .map(t => t.topic?.name?.toLowerCase())
      .filter((n): n is string => !!n)
  )

  type Row = { id: string; title: string; slug: string; type: string; summary: string | null; cover_image_url: string | null; tags: string[] | null }
  const pool = (poolRes.data ?? []) as Row[]
  const matching = topicNames.size === 0
    ? pool
    : pool.filter(r => (r.tags ?? []).some(t => topicNames.has(t.toLowerCase())))

  return (matching.length > 0 ? matching : pool).slice(0, limit)
    .map(r => ({ id: r.id, title: r.title, slug: r.slug, type: r.type, summary: r.summary, coverImageUrl: r.cover_image_url, tags: r.tags ?? [] }))
}

// Profile completion percentage (Epic D §D.2 header) — pure function, no
// client needed. Fixed weighted field list; each present field counts
// once. Not stored, computed on read so it never drifts from reality.
const PROFILE_COMPLETION_FIELDS = [
  'avatar_url', 'headline', 'job_role', 'country', 'bio', 'skills',
  'linkedin_url', 'experience_level',
] as const

export function getProfileCompletionPercent(user: Record<string, unknown>): number {
  let filled = 0
  for (const field of PROFILE_COMPLETION_FIELDS) {
    const v = user[field]
    if (Array.isArray(v) ? v.length > 0 : !!v) filled++
  }
  return Math.round((filled / PROFILE_COMPLETION_FIELDS.length) * 100)
}
