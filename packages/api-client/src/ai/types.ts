// Epic E shared types — the grounding layer's vocabulary. Kept in its own
// file since both retrieval and the app-side generation code need them.

export interface GroundedItem {
  id: string
  title: string
  slug: string
  type: string
  /** Short excerpt (summary or truncated body) — enough for the model to
   * judge relevance without shipping the full body of every candidate. */
  excerpt: string
}

export type AiFeature = 'learning_path' | 'recommendation' | 'continue_from_here' | 'content_assistance'
export type ContentAssistanceAction = 'key_takeaways' | 'action_checklist' | 'reflection_questions'

/** The one instruction block every Epic E prompt includes verbatim —
 * standing rule 2 (grounding is not optional) lives here, once, instead
 * of being retyped slightly differently in four different prompts. */
export const GROUNDING_SYSTEM_RULES = `You are grounded strictly in ProductSlice HQ's own content. You will be given a numbered list of real content items, each with a real ID. Rules, no exceptions:
1. You may only reference content IDs from the provided list. Never invent a title, ID, or resource that isn't in that list.
2. If the provided content is not enough to do the task well, say so plainly instead of inventing something to fill the gap. Use language like: "We don't currently have enough ProductSlice resources for this part of your goal."
3. Respond with ONLY valid JSON in the exact shape requested — no markdown fences, no commentary outside the JSON.`

export function formatGroundingBlock(items: GroundedItem[]): string {
  if (items.length === 0) return '(no matching ProductSlice content was found)'
  return items.map((it, i) => `${i + 1}. ID: ${it.id} | Type: ${it.type} | Title: "${it.title}" | ${it.excerpt}`).join('\n')
}

/** Drops any id not present in the retrieved set — the post-generation
 * validation step standing rule 2 requires. Never patched over silently:
 * callers log rejected ids via logAiInteraction's rejectedIds field. */
export function filterToAllowedIds(ids: string[], allowedIds: ReadonlySet<string>): { kept: string[]; rejected: string[] } {
  const kept: string[] = []
  const rejected: string[] = []
  for (const id of ids) {
    if (allowedIds.has(id)) kept.push(id)
    else rejected.push(id)
  }
  return { kept, rejected }
}

/** Best-effort JSON extraction — models occasionally wrap JSON in prose
 * or fences despite instructions; this recovers the object without
 * pretending the model followed instructions perfectly. */
export function extractJson<T>(text: string): T {
  const trimmed = text.trim()
  const jsonText = trimmed.startsWith('{') || trimmed.startsWith('[')
    ? trimmed
    : trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1)
  return JSON.parse(jsonText) as T
}
