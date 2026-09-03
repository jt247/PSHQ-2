import type { SupabaseClient } from '@supabase/supabase-js'

// Epic J §J.5-J.6 — Weekly ProductSlice Digest. Candidate assembly follows
// the exact grounding discipline retrieveContinueFromHere (Build Prompt 6)
// established: real, already-published rows only, and an honest null when
// nothing qualifies rather than a forced or fabricated match. Nothing here
// calls an LLM — this is pure metadata retrieval, same as Continue From
// Here, because every slot has a clear real-data definition and doesn't
// need generation.

export interface DigestCandidate { id: string; title: string; slug: string; type: string }
export interface DigestCandidates {
  insight: DigestCandidate | null
  resource: DigestCandidate | null
  buildNote: DigestCandidate | null
  communityHighlight: { userId: string; name: string; note: string } | null
  suggestedThingToTry: { title: string; slug: string; kind: 'learning_path' } | null
}

async function alreadyUsedContentIds(service: SupabaseClient): Promise<Set<string>> {
  const { data } = await service
    .from('digest_issues')
    .select('insight_content_id, resource_content_id, build_note_content_id')
  const ids = new Set<string>()
  for (const row of (data ?? []) as Array<Record<string, string | null>>) {
    for (const key of ['insight_content_id', 'resource_content_id', 'build_note_content_id']) {
      if (row[key]) ids.add(row[key] as string)
    }
  }
  return ids
}

/**
 * Assembles the five candidate slots for a new digest issue. Every slot
 * is either a real row or null — never fabricated. `topicId` narrows the
 * insight/resource picks to content tagged with that topic (§J.6's
 * "segment by topic where feasible"); the build note and community
 * highlight aren't topic-specific by nature, so they're unaffected.
 */
export async function assembleDigestCandidates(service: SupabaseClient, topicId?: string | null): Promise<DigestCandidates> {
  const used = await alreadyUsedContentIds(service)

  async function pickLatest(type: string): Promise<DigestCandidate | null> {
    let query = service.from('content').select('id, title, slug, type').eq('status', 'published').eq('type', type).order('published_at', { ascending: false }).limit(20)
    if (topicId) {
      const { data: topicContentIds } = await service.from('content_topics').select('content_id').eq('topic_id', topicId)
      const ids = (topicContentIds ?? []).map(r => (r as { content_id: string }).content_id)
      if (ids.length === 0) return null // honest: no real content for this topic, don't fall back to something unrelated
      query = query.in('id', ids)
    }
    const { data } = await query
    const rows = (data ?? []) as DigestCandidate[]
    return rows.find(r => !used.has(r.id)) ?? null
  }

  const [insight, resource, buildNote] = await Promise.all([
    pickLatest('article'),
    // "practical resource" — prefer a template/ebook over another article.
    (async () => (await pickLatest('template')) ?? (await pickLatest('ebook')))(),
    pickLatest('build_note'),
  ])

  // Community highlight: this week's #1 on the real weekly leaderboard —
  // the same get_leaderboard() RPC the web/mobile leaderboard screens use,
  // not a separate calculation.
  const { data: leaderboard } = await service.rpc('get_leaderboard', { p_period: 'weekly', p_limit: 1 })
  type LbRow = { user_id: string; display_name: string; score: number }
  const top = ((leaderboard ?? []) as LbRow[])[0]
  const communityHighlight = top
    ? { userId: top.user_id, name: top.display_name, note: `Top of this week's leaderboard with ${top.score} contribution points.` }
    : null

  // Thing to try: the real published learning path with the fewest
  // starts — a genuine discovery nudge, not an invented suggestion.
  const { data: paths } = await service.from('learning_paths').select('id, slug, title').eq('status', 'published')
  let suggestedThingToTry: DigestCandidates['suggestedThingToTry'] = null
  if (paths && paths.length > 0) {
    const { data: starts } = await service.from('user_learning_paths').select('learning_path_id')
    const startCounts = new Map<string, number>()
    for (const s of (starts ?? []) as Array<{ learning_path_id: string }>) {
      startCounts.set(s.learning_path_id, (startCounts.get(s.learning_path_id) ?? 0) + 1)
    }
    const leastStarted = (paths as Array<{ id: string; slug: string; title: string }>)
      .sort((a, b) => (startCounts.get(a.id) ?? 0) - (startCounts.get(b.id) ?? 0))[0]
    suggestedThingToTry = { title: leastStarted.title, slug: leastStarted.slug, kind: 'learning_path' }
  }

  return { insight, resource, buildNote, communityHighlight, suggestedThingToTry }
}
