import type { SupabaseClient } from '@supabase/supabase-js'
import { retrieveForLearningPath, GROUNDING_SYSTEM_RULES, formatGroundingBlock, filterToAllowedIds, extractJson, logAiInteraction, logContentGap } from '@pshq/api-client/ai'
import { generateText, AI_MODEL_NAME } from './client'

export interface LearningPathIntake {
  goalText: string
  roleId: string | null
  roleName: string | null
  level: string | null
  existingSkills: string[]
  weeklyMinutes: number
  topicNames: string[]
  targetTimelineWeeks: number
}

interface RawModule { contentId: string; title: string; description: string }
interface RawPlan { title: string; goalSummary: string; milestones: string[]; completionCriteria: string; modules: RawModule[] }

export type LearningPathResult =
  | { insufficientContent: true; message: string }
  | { insufficientContent: false; learningPathId: string; slug: string; title: string; moduleCount: number }

const MAX_PER_MONTH = 3

/** E.1-E.3 — Create My Learning Path. The one AI feature in this epic
 * that writes new rows on success (learning_paths + learning_path_modules
 * + user_learning_paths), so it's the one with a real per-user cost cap
 * (JT decision: 3 per calendar month) enforced before any generation call
 * is even attempted. */
export async function getMonthlyLearningPathCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('learning_paths')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId)
    .eq('source', 'ai_generated')
    .gte('created_at', startOfMonth.toISOString())

  return count ?? 0
}

export async function createCustomLearningPath(supabase: SupabaseClient, userId: string, intake: LearningPathIntake): Promise<LearningPathResult> {
  const used = await getMonthlyLearningPathCount(supabase, userId)
  if (used >= MAX_PER_MONTH) {
    throw new MonthlyLimitError(used)
  }

  const retrieved = await retrieveForLearningPath(supabase, {
    roleName: intake.roleName,
    level: intake.level,
    topicNames: intake.topicNames,
    goalNames: [],
  })

  if (retrieved.length < 3) {
    await logContentGap(supabase, {
      feature: 'learning_path',
      userId,
      context: { goalText: intake.goalText, topicNames: intake.topicNames, level: intake.level },
      note: `Only ${retrieved.length} candidate content items found for this goal/topic combination.`,
    })
    return { insufficientContent: true, message: "We don't currently have enough ProductSlice resources for this part of your goal." }
  }

  const recommendedModuleCount = Math.max(3, Math.min(8, Math.round((intake.targetTimelineWeeks * intake.weeklyMinutes) / 90)))

  const prompt = `${GROUNDING_SYSTEM_RULES}

The member wants a personalized learning path. Their intake:
- What they're trying to achieve: ${intake.goalText}
- Current role: ${intake.roleName ?? 'not specified'}
- Experience level: ${intake.level ?? 'not specified'}
- Existing skills: ${intake.existingSkills.join(', ') || 'none listed'}
- Weekly time commitment: ${intake.weeklyMinutes} minutes
- Priority topics: ${intake.topicNames.join(', ') || 'none specified'}
- Target timeline: ${intake.targetTimelineWeeks} weeks

Real ProductSlice content available to build this path from:
${formatGroundingBlock(retrieved)}

Design a learning path with approximately ${recommendedModuleCount} modules, each built around exactly ONE of the content IDs above (do not reuse the same ID twice), ordered sensibly from foundational to advanced. Respond with ONLY valid JSON in this exact shape:
{
  "title": "short path title",
  "goalSummary": "one sentence restating their goal",
  "milestones": ["milestone 1", "milestone 2", "..."],
  "completionCriteria": "one sentence describing what 'done' looks like",
  "modules": [{ "contentId": "<id from the list above>", "title": "module title", "description": "1-2 sentences on why this module, in this order" }]
}`

  const raw = await generateText(prompt)
  const parsed = extractJson<RawPlan>(raw)

  const allowedIds = new Set(retrieved.map(r => r.id))
  const seen = new Set<string>()
  const dedupedModules = parsed.modules.filter(m => (seen.has(m.contentId) ? false : (seen.add(m.contentId), true)))
  const { kept, rejected } = filterToAllowedIds(dedupedModules.map(m => m.contentId), allowedIds)
  const validModules = dedupedModules.filter(m => kept.includes(m.contentId))

  await logAiInteraction(supabase, {
    userId,
    feature: 'learning_path',
    inputContext: intake as unknown as Record<string, unknown>,
    retrievedContentIds: retrieved.map(r => r.id),
    output: parsed,
    validationPassed: rejected.length === 0,
    rejectedIds: rejected,
    modelUsed: AI_MODEL_NAME,
  })

  if (validModules.length < 3) {
    await logContentGap(supabase, {
      feature: 'learning_path',
      userId,
      context: { goalText: intake.goalText, topicNames: intake.topicNames, rejectedIds: rejected },
      note: `AI produced only ${validModules.length} valid modules after grounding validation (${rejected.length} rejected as not-real).`,
    })
    return { insufficientContent: true, message: "We don't currently have enough ProductSlice resources for this part of your goal." }
  }

  const slug = `${parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${userId.slice(0, 8)}`

  const { data: path, error: pathError } = await supabase
    .from('learning_paths')
    .insert({
      slug,
      title: parsed.title,
      description: parsed.goalSummary,
      level: intake.level,
      estimated_time_minutes: intake.weeklyMinutes * intake.targetTimelineWeeks,
      status: 'draft', // never public — visible to its creator only, via the self-read-own policy
      source: 'ai_generated',
      created_by: userId,
      goal_summary: parsed.goalSummary,
      weekly_time_commitment_minutes: intake.weeklyMinutes,
      target_timeline_weeks: intake.targetTimelineWeeks,
      milestones: parsed.milestones,
      completion_criteria: parsed.completionCriteria,
    })
    .select('id, slug, title')
    .single()

  if (pathError || !path) throw new Error(`Failed to save learning path: ${pathError?.message}`)

  await supabase.from('learning_path_modules').insert(
    validModules.map((m, i) => ({
      learning_path_id: path.id,
      content_id: m.contentId,
      title: m.title,
      description: m.description,
      is_required: true,
      sequence: i,
    }))
  )

  await supabase.from('user_learning_paths').insert({ user_id: userId, learning_path_id: path.id })

  return { insufficientContent: false, learningPathId: path.id, slug: path.slug, title: path.title, moduleCount: validModules.length }
}

export class MonthlyLimitError extends Error {
  constructor(public used: number) {
    super(`You've created ${used} custom learning paths this month. You can create up to ${MAX_PER_MONTH} per month — try again next month.`)
    this.name = 'MonthlyLimitError'
  }
}
