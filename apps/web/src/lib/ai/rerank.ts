import type { SupabaseClient } from '@supabase/supabase-js'
import { GROUNDING_SYSTEM_RULES, formatGroundingBlock, filterToAllowedIds, extractJson, logAiInteraction, type GroundedItem } from '@pshq/api-client/ai'
import { generateText, AI_MODEL_NAME } from './client'

export type RecommendationSlot = 'recommended_for_you' | 'new_for_you' | 'onboarding_starting_point'

interface RerankContext {
  roleName: string | null
  level: string | null
  topicNames: string[]
  goalNames: string[]
}

const CACHE_WINDOW_HOURS = 24

/** E.6 — Layer 2 AI-assisted ranking. Re-ranks and prunes what Layer 1
 * (the existing rules-based stubs) already retrieved; never adds a
 * candidate Layer 1 didn't surface. Cached per user per slot for 24h via
 * ai_interactions itself (no separate cache table) — the real cost
 * control JT asked for: at most one OpenAI call per user per slot per
 * day, everything else reads the cache. Falls back to the original
 * Layer-1 order on ANY failure (parse error, API error, thin candidate
 * set) — reranking is an enhancement, never a point of failure for a
 * feature that already worked without it. */
export async function rerankRecommendations<T extends GroundedItem>(
  supabase: SupabaseClient,
  userId: string,
  slot: RecommendationSlot,
  candidates: T[],
  context: RerankContext
): Promise<T[]> {
  if (candidates.length <= 1) return candidates

  const cached = await getCachedRanking(supabase, userId, slot)
  if (cached) return applyRanking(candidates, cached)

  try {
    const allowedIds = new Set(candidates.map(c => c.id))
    const prompt = `${GROUNDING_SYSTEM_RULES}

Re-rank the following real ProductSlice content candidates for this member, most relevant first. You may drop weak matches but must not add anything not in this list.

Member context:
- Role: ${context.roleName ?? 'not specified'}
- Level: ${context.level ?? 'not specified'}
- Topics: ${context.topicNames.join(', ') || 'none specified'}
- Goals: ${context.goalNames.join(', ') || 'none specified'}

Candidates:
${formatGroundingBlock(candidates)}

Respond with ONLY valid JSON in this exact shape:
{ "rankedIds": ["<id>", "<id>", "..."] }`

    const raw = await generateText(prompt)
    const parsed = extractJson<{ rankedIds: string[] }>(raw)
    const { kept, rejected } = filterToAllowedIds(parsed.rankedIds, allowedIds)

    await logAiInteraction(supabase, {
      userId,
      feature: 'recommendation',
      inputContext: { slot, ...context },
      retrievedContentIds: candidates.map(c => c.id),
      output: { rankedIds: kept },
      validationPassed: rejected.length === 0,
      rejectedIds: rejected,
      modelUsed: AI_MODEL_NAME,
    })

    if (kept.length === 0) return candidates
    return applyRanking(candidates, kept)
  } catch {
    // Silent fallback by design — see function comment.
    return candidates
  }
}

async function getCachedRanking(supabase: SupabaseClient, userId: string, slot: RecommendationSlot): Promise<string[] | null> {
  const since = new Date(Date.now() - CACHE_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('ai_interactions')
    .select('output, input_context, validation_passed')
    .eq('user_id', userId)
    .eq('feature', 'recommendation')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10)

  type Row = { output: { rankedIds?: string[] } | null; input_context: { slot?: string } | null; validation_passed: boolean }
  const match = ((data ?? []) as unknown as Row[]).find(r => r.input_context?.slot === slot && r.validation_passed)
  return match?.output?.rankedIds ?? null
}

function applyRanking<T extends GroundedItem>(candidates: T[], rankedIds: string[]): T[] {
  const byId = new Map(candidates.map(c => [c.id, c]))
  const ranked = rankedIds.map(id => byId.get(id)).filter((c): c is T => !!c)
  const remaining = candidates.filter(c => !rankedIds.includes(c.id))
  return [...ranked, ...remaining]
}
