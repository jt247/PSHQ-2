import type { SupabaseClient } from '@supabase/supabase-js'

// Mirrors the 5 rows seeded in packages/database migration 20260902000031
// — fixed, rarely-changing display metadata kept as a constant (same
// pattern as NOTIFICATION_TYPES) so pages that only have achievement KEYS
// (like get_public_profile's achievement_keys column) can render a badge
// without an extra round trip to the achievements table.
export const ACHIEVEMENT_METADATA: Record<string, { title: string; description: string; icon: string }> = {
  first_slice: { title: 'First Slice', description: 'Complete your first learning resource', icon: '🍕' },
  product_explorer: { title: 'Product Explorer', description: 'Complete 10 learning resources', icon: '🧭' },
  path_builder: { title: 'Path Builder', description: 'Complete your first learning path', icon: '🛤️' },
  product_operator: { title: 'Product Operator', description: 'Complete 5 practical templates or resources', icon: '🛠️' },
  deep_learner: { title: 'Deep Learner', description: 'Complete learning activity on 10 separate days', icon: '📚' },
}

export interface EarnedAchievement {
  key: string
  title: string
  description: string
  icon: string
  earnedAt: string
}

/** Real earned achievements for the calling user, joined to the fixed
 * achievements reference table. Empty array for a member who hasn't
 * earned one yet — callers render the honest empty state established in
 * Build Prompt 5 for that case, never a placeholder badge. */
export async function getMyAchievements(supabase: SupabaseClient, userId: string): Promise<EarnedAchievement[]> {
  const { data } = await supabase
    .from('user_achievements')
    .select('earned_at, achievement:achievements(key, title, description, icon)')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false })

  type Row = { earned_at: string; achievement: { key: string; title: string; description: string; icon: string } | null }
  return ((data ?? []) as unknown as Row[])
    .filter((r): r is Row & { achievement: NonNullable<Row['achievement']> } => !!r.achievement)
    .map(r => ({ key: r.achievement.key, title: r.achievement.title, description: r.achievement.description, icon: r.achievement.icon, earnedAt: r.earned_at }))
}

/** Runs the real unlock check (packages/database migration 20260902000031)
 * and returns any newly-earned achievement keys this call — callers fire
 * achievement_unlocked for each. Idempotent (safe to call on every
 * dashboard/profile load) and cheap (a handful of count queries). */
export async function checkAndAwardAchievements(supabase: SupabaseClient): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('check_and_award_achievements')
    if (error || !data) return []
    return data as string[]
  } catch {
    return []
  }
}

export async function checkAndAwardStreakBonus(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_and_award_streak_bonus')
    return !error && !!data
  } catch {
    return false
  }
}
