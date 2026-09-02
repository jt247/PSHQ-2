import type { SupabaseClient } from '@supabase/supabase-js'

// Epic F §F.2 — the one call site every self-generated scoring action goes
// through. Thin wrapper around award_contribution_event() (packages/
// database migration 20260902000031) — all the real logic (daily caps,
// dedup, points lookup, "no self-generated admin points") lives in that
// SECURITY DEFINER function, not here. Never throws — a scoring failure
// must never break the action it's attached to (same contract as
// packages/analytics' track()).
export type ContributionAction =
  | 'content_completed' | 'favorite' | 'rating' | 'thoughtful_comment'
  | 'module_completed' | 'path_completed' | 'streak_bonus'

export async function awardContribution(
  supabase: SupabaseClient,
  action: ContributionAction,
  refId: string | null,
  dedupeKey: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('award_contribution_event', {
      p_action: action, p_ref_id: refId, p_dedupe_key: dedupeKey,
    })
    return !error && !!data
  } catch {
    return false
  }
}

// "Thoughtful" per §F.2 is a judgment call the prompt explicitly leaves to
// this pass: a length floor. 40 characters is roughly "a real sentence,"
// not "nice article!" — JT can adjust.
export const THOUGHTFUL_COMMENT_MIN_LENGTH = 40

// Duplicate-comment protection (§F.3) — normalizes whitespace/case so
// "Great article!" and "great   article!" collide, both for the scoring
// dedupe key AND for the app-level spam check in postCommentAction that
// blocks posting the near-duplicate outright, not just scoring it once.
export function normalizeCommentText(body: string): string {
  return body.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 200)
}

// Epic G Step 11 — a light heuristic run at post time so the comment
// moderation queue has a real "flagged" pool to review, not just whatever
// an admin happens to stumble on. Link spam (2+ URLs) is the cheapest,
// highest-signal check available without a real spam-detection pipeline;
// documented as an interim heuristic, not a claim of full spam detection.
export function isLikelySpamComment(body: string): boolean {
  const urlMatches = body.match(/https?:\/\/\S+/gi) ?? []
  return urlMatches.length >= 2
}
