import type { SupabaseClient } from '@supabase/supabase-js'
import { extractJson, type ContentAssistanceAction } from '@pshq/api-client/ai'
import { logAiInteraction } from '@pshq/api-client/ai'
import { generateText, AI_MODEL_NAME } from './client'

// Epic E §E.10/E.12/E.13 — Key Takeaways, Action Checklist, Questions to
// Reflect. Explain Simply (E.11) is deliberately not built here (JT
// decision, 2026-09-01: summaries already do that job). Summarize (E.9)
// keeps using the pre-existing ai_summaries table/route unchanged, also
// per JT — not duplicated here.
//
// Grounding here is different from recommendations/learning paths: there
// is no candidate-ID selection risk (the model isn't choosing among other
// content), the grounding constraint is "stay faithful to this specific
// article's body" — enforced by giving the model nothing but that body,
// not by post-hoc ID filtering.

interface ContentForAssistance {
  id: string
  title: string
  body: string
  updated_at: string
}

const PROMPTS: Record<ContentAssistanceAction, (title: string, body: string) => string> = {
  key_takeaways: (title, body) => `You are an expert product management educator. Read the following article and extract 5 to 8 specific, concrete key takeaways — not generic advice, only things this specific article actually says.

Title: ${title}

Body:
${body.slice(0, 8000)}

Respond with ONLY valid JSON in this exact shape:
{ "takeaways": ["takeaway 1", "takeaway 2", "..."] }`,

  action_checklist: (title, body) => `You are an expert product management educator. Read the following article and convert its applicable concepts into an executable checklist — concrete, specific tasks a reader could actually do this week, grounded in what this article says, not generic productivity advice.

Title: ${title}

Body:
${body.slice(0, 8000)}

Respond with ONLY valid JSON in this exact shape:
{ "checklist": ["task 1", "task 2", "..."] }`,

  reflection_questions: (title, body) => `You are an expert product management educator. Read the following article and write 3 to 5 applied reflection questions — questions that ask the reader to relate the article's ideas to their own work, not quiz questions testing recall of facts.

Title: ${title}

Body:
${body.slice(0, 8000)}

Respond with ONLY valid JSON in this exact shape:
{ "questions": ["question 1", "question 2", "..."] }`,
}

export async function getOrGenerateContentAssistance(
  supabase: SupabaseClient,
  content: ContentForAssistance,
  actionType: ContentAssistanceAction,
  userId: string
): Promise<{ output: Record<string, string[]>; cached: boolean }> {
  const { data: cached } = await supabase
    .from('ai_content_assistance')
    .select('output, content_updated_snapshot')
    .eq('content_id', content.id)
    .eq('action_type', actionType)
    .maybeSingle()

  if (cached && new Date(cached.content_updated_snapshot) >= new Date(content.updated_at)) {
    return { output: cached.output as unknown as Record<string, string[]>, cached: true }
  }

  if (!content.body || content.body.trim().length < 200) {
    // Standing rule 2's fallback — not enough real content to ground
    // this action in, so say so rather than generating something thin.
    throw new InsufficientContentError()
  }

  const prompt = PROMPTS[actionType](content.title, content.body)
  const raw = await generateText(prompt)
  const output = extractJson<Record<string, string[]>>(raw)

  await supabase.from('ai_content_assistance').upsert(
    {
      content_id: content.id,
      action_type: actionType,
      output: output as never,
      model_used: AI_MODEL_NAME,
      content_updated_snapshot: content.updated_at,
      requested_by: userId,
    },
    { onConflict: 'content_id,action_type' }
  )

  await logAiInteraction(supabase, {
    userId,
    feature: 'content_assistance',
    inputContext: { contentId: content.id, actionType },
    retrievedContentIds: [content.id],
    output,
    validationPassed: true,
    rejectedIds: [],
    modelUsed: AI_MODEL_NAME,
  })

  return { output, cached: false }
}

export class InsufficientContentError extends Error {
  constructor() {
    super("We don't currently have enough ProductSlice content on this page to do that well yet.")
    this.name = 'InsufficientContentError'
  }
}
