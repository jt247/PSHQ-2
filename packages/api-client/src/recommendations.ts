import type { SupabaseClient } from '@supabase/supabase-js'

// Onboarding's "Recommended starting point" (Epic A.10) — a simple
// rules-based stub matching content tags against the user's selected
// Topics. Learning Path and Collection are real entities in Epic B; until
// then a course and an ebook stand in for them so the screen shows
// something real rather than an empty slot. Epic E's real recommendation
// engine replaces the body of this function — every call site (web's
// onboarding complete screen, mobile's, presumably a dashboard section
// later) keeps working unchanged as long as the return shape doesn't move.
//
// Deliberately its own file, not part of queries.ts: queries.ts imports
// './supabase/server' (next/headers) at module scope, which breaks Metro
// bundling the moment mobile imports anything from that file. This one
// takes the caller's own Supabase client instead — web passes its RLS-bound
// server client, mobile passes the AsyncStorage client from
// @pshq/api-client/mobile — so it has no platform-specific dependency.
export interface StarterRecommendationItem {
  id: string
  title: string
  slug: string
  type: string
  summary: string | null
  coverImageUrl: string | null
}

export interface StarterRecommendations {
  primaryPath: StarterRecommendationItem | null
  articles: StarterRecommendationItem[]
  template: StarterRecommendationItem | null
  collection: StarterRecommendationItem | null
}

export async function getStarterRecommendations(supabase: SupabaseClient, userId: string): Promise<StarterRecommendations> {
  const [topicsRes, coursesRes, articlesRes, templatesRes, ebooksRes] = await Promise.all([
    supabase.from('user_topics').select('topic:topics(name)').eq('user_id', userId),
    supabase.from('content').select('id, title, slug, type, summary, cover_image_url, tags').eq('status', 'published').eq('type', 'course').order('published_at', { ascending: false }).limit(20),
    supabase.from('content').select('id, title, slug, type, summary, cover_image_url, tags').eq('status', 'published').eq('type', 'article').order('published_at', { ascending: false }).limit(40),
    supabase.from('content').select('id, title, slug, type, summary, cover_image_url, tags').eq('status', 'published').eq('type', 'template').order('published_at', { ascending: false }).limit(20),
    supabase.from('content').select('id, title, slug, type, summary, cover_image_url, tags').eq('status', 'published').eq('type', 'ebook').order('published_at', { ascending: false }).limit(20),
  ])

  const topicNames = new Set(
    ((topicsRes.data ?? []) as unknown as Array<{ topic: { name: string } | null }>)
      .map(t => t.topic?.name?.toLowerCase())
      .filter((n): n is string => !!n)
  )

  type Row = { id: string; title: string; slug: string; type: string; summary: string | null; cover_image_url: string | null; tags: string[] | null }
  const toItem = (r: Row): StarterRecommendationItem => ({
    id: r.id, title: r.title, slug: r.slug, type: r.type, summary: r.summary, coverImageUrl: r.cover_image_url,
  })
  const score = (r: Row) => (r.tags ?? []).filter(t => topicNames.has(t.toLowerCase())).length
  const bestFirst = (rows: Row[]) => [...rows].sort((a, b) => score(b) - score(a))

  const courses = bestFirst((coursesRes.data ?? []) as Row[])
  const articles = bestFirst((articlesRes.data ?? []) as Row[])
  const templates = bestFirst((templatesRes.data ?? []) as Row[])
  const ebooks = bestFirst((ebooksRes.data ?? []) as Row[])

  return {
    primaryPath: courses[0] ? toItem(courses[0]) : null,
    articles: articles.slice(0, 3).map(toItem),
    template: templates[0] ? toItem(templates[0]) : null,
    collection: ebooks[0] ? toItem(ebooks[0]) : null,
  }
}
