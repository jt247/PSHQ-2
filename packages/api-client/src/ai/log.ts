import type { SupabaseClient } from '@supabase/supabase-js'
import type { AiFeature } from './types'

/** Standing rule 1 (Step 1.4): every call through the grounding layer
 * writes an AIInteraction record. One implementation, called by every
 * feature's server-side orchestration — not re-logged slightly
 * differently per feature. */
export async function logAiInteraction(supabase: SupabaseClient, params: {
  userId: string | null
  feature: AiFeature
  inputContext: Record<string, unknown>
  retrievedContentIds: string[]
  output: unknown
  validationPassed: boolean
  rejectedIds: string[]
  modelUsed: string
}): Promise<void> {
  try {
    await supabase.from('ai_interactions').insert({
      user_id: params.userId,
      feature: params.feature,
      input_context: params.inputContext,
      retrieved_content_ids: params.retrievedContentIds,
      output: params.output as never,
      validation_passed: params.validationPassed,
      rejected_ids: params.rejectedIds,
      model_used: params.modelUsed,
    })
  } catch {
    // Logging must never break the feature it's observing — same
    // contract as packages/analytics' track().
  }
}

/** Step 5's "log content gaps somewhere JT can review" — one row per
 * request that retrieval couldn't answer well. Never patched over with
 * invented content; this is the real signal for what to build next. */
export async function logContentGap(supabase: SupabaseClient, params: {
  feature: AiFeature
  userId: string | null
  context: Record<string, unknown>
  note?: string
}): Promise<void> {
  try {
    await supabase.from('content_gaps').insert({
      feature: params.feature,
      user_id: params.userId,
      context: params.context,
      note: params.note ?? null,
    })
  } catch {
    // non-fatal
  }
}
