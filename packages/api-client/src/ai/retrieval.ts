import type { SupabaseClient } from '@supabase/supabase-js'
import type { GroundedItem } from './types'

export interface LearningPathIntakeContext {
  roleName: string | null
  level: string | null
  topicNames: string[]
  goalNames: string[]
}

/** Retrieval for Create My Learning Path (E.1-E.3) — a broad, real
 * candidate pool across every content type, scored by overlap with the
 * member's intake answers. This is deliberately wider than the dashboard
 * recommendation stubs (60-100 candidates vs their ~30-60) since a
 * multi-module path needs enough real material to draw several distinct
 * modules from, not just a top-6 list. */
export async function retrieveForLearningPath(supabase: SupabaseClient, ctx: LearningPathIntakeContext, limit = 80): Promise<GroundedItem[]> {
  const { data } = await supabase
    .from('content')
    .select('id, title, slug, type, summary, tags, domain, level')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(200)

  type Row = { id: string; title: string; slug: string; type: string; summary: string | null; tags: string[] | null; domain: string | null; level: string | null }
  const rows = (data ?? []) as Row[]

  const labelSet = new Set([...ctx.topicNames, ...ctx.goalNames, ctx.roleName].filter((v): v is string => !!v).map(v => v.toLowerCase()))
  const score = (r: Row) => {
    let s = (r.tags ?? []).filter(t => labelSet.has(t.toLowerCase())).length * 2
    if (ctx.level && r.level === ctx.level) s += 1
    return s
  }

  // Only genuinely relevant candidates (score > 0) — without this filter,
  // a topic combination with zero real matches would still return the
  // whole published catalog sorted arbitrarily, which would silently
  // defeat the "insufficient content" fallback (standing rule 2) by
  // always looking like there was enough to work with. Caught via a real
  // test case: 'AI Engineering' + 'Experimentation' at 'senior' level
  // scores 0 candidates against today's actual seeded content.
  return rows
    .map(r => ({ r, s: score(r) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ r }) => ({ id: r.id, title: r.title, slug: r.slug, type: r.type, excerpt: r.summary ?? '(no summary)' }))
}

/** Layer 1 retrieval for Continue From Here (E.7) — pure metadata lookup,
 * no AI call. Priority per the prompt: next item in the current series,
 * a relevant template, a relevant learning path, a related article, a
 * related collection. Deliberately Layer-1-only (see SIDENOTES.md for the
 * cost/scope reasoning) — "mostly a metadata lookup" per the prompt, and
 * keeping it AI-free keeps one more OpenAI call off every content page
 * view. */
export interface ContinueFromHereItem { id: string; title: string; slug: string; type: string; reason: string }

export async function retrieveContinueFromHere(
  supabase: SupabaseClient,
  ctx: { contentId: string; domain: string | null; tags: string[]; seriesId: string | null }
): Promise<ContinueFromHereItem[]> {
  const results: ContinueFromHereItem[] = []

  if (ctx.seriesId) {
    const { data: seriesItems } = await supabase
      .from('series_items')
      .select('sequence, content:content_id(id, title, slug, type, status)')
      .eq('series_id', ctx.seriesId)
      .order('sequence')
    type Row = { sequence: number; content: { id: string; title: string; slug: string; type: string; status: string } | null }
    const items = ((seriesItems ?? []) as unknown as Row[]).filter(r => r.content?.status === 'published')
    const currentIdx = items.findIndex(r => r.content!.id === ctx.contentId)
    const next = currentIdx >= 0 ? items[currentIdx + 1] : undefined
    if (next?.content) results.push({ id: next.content.id, title: next.content.title, slug: next.content.slug, type: next.content.type, reason: 'Next in this series' })
  }

  const tagSet = new Set(ctx.tags.map(t => t.toLowerCase()))

  // Relevant template + related article — real content rows.
  for (const [type, reason] of [['template', 'Relevant template'], ['article', 'Related article']] as const) {
    if (results.length >= 5) break
    const { data } = await supabase
      .from('content')
      .select('id, title, slug, type, tags, domain')
      .eq('status', 'published')
      .eq('type', type)
      .neq('id', ctx.contentId)
      .limit(30)
    type Row = { id: string; title: string; slug: string; type: string; tags: string[] | null; domain: string | null }
    const rows = (data ?? []) as Row[]
    const best = rows
      .filter(r => !results.some(existing => existing.id === r.id))
      .map(r => ({ r, s: (r.tags ?? []).filter(t => tagSet.has(t.toLowerCase())).length + (r.domain === ctx.domain ? 1 : 0) }))
      .sort((a, b) => b.s - a.s)[0]
    if (best && best.s > 0) results.push({ id: best.r.id, title: best.r.title, slug: best.r.slug, type: best.r.type, reason })
  }

  // Relevant learning path — a real, distinct table from `content`.
  if (results.length < 5) {
    const { data: paths } = await supabase
      .from('learning_paths')
      .select('id, slug, title, display_order')
      .eq('status', 'published')
      .order('display_order')
      .limit(1)
    const best = (paths ?? [])[0] as { id: string; slug: string; title: string } | undefined
    if (best) results.push({ id: best.id, title: best.title, slug: best.slug, type: 'learning_path', reason: 'Relevant learning path' })
  }

  if (results.length < 5) {
    const { data: collections } = await supabase
      .from('collections')
      .select('id, title, slug, collection_items!inner(content_id)')
      .eq('status', 'published')
      .eq('collection_items.content_id', ctx.contentId)
      .limit(1)
    const col = (collections ?? [])[0] as { id: string; title: string; slug: string } | undefined
    if (col) results.push({ id: col.id, title: col.title, slug: col.slug, type: 'collection', reason: 'Part of this collection' })
  }

  return results.slice(0, 5)
}
