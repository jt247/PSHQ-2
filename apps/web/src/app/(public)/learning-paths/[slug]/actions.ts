'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { trackLearningPathStarted, trackLearningModuleCompleted, trackLearningPathCompleted, trackContentMarkedComplete } from '@pshq/analytics'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function startPathAction(pathId: string, pathSlug: string) {
  const { supabase, user } = await requireUser()
  const service = createServiceClient()

  const { data: existing } = await service.from('user_learning_paths').select('id').eq('user_id', user.id).eq('learning_path_id', pathId).maybeSingle()
  if (!existing) {
    await service.from('user_learning_paths').insert({ user_id: user.id, learning_path_id: pathId })
    await trackLearningPathStarted({ supabase, source: 'web', userId: user.id }, { contentId: pathId })
  }
  revalidatePath(`/learning-paths/${pathSlug}`)
}

export async function toggleModuleCompleteAction(moduleId: string, pathId: string, pathSlug: string, markComplete: boolean) {
  const { supabase, user } = await requireUser()
  const service = createServiceClient()

  await service.from('module_progress').upsert({
    user_id: user.id,
    module_id: moduleId,
    status: markComplete ? 'completed' : 'not_started',
    completed_at: markComplete ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,module_id' })

  if (markComplete) {
    await trackLearningModuleCompleted({ supabase, source: 'web', userId: user.id }, { contentId: moduleId })
    await trackContentMarkedComplete({ supabase, source: 'web', userId: user.id }, { contentId: moduleId, metadata: { auto: false } })

    // Check if every required module in the path is now complete.
    const { data: modules } = await service.from('learning_path_modules').select('id, is_required').eq('learning_path_id', pathId)
    const requiredIds = (modules ?? []).filter(m => m.is_required).map(m => m.id)
    if (requiredIds.length > 0) {
      const { data: completed } = await service.from('module_progress').select('module_id').eq('user_id', user.id).eq('status', 'completed').in('module_id', requiredIds)
      if ((completed ?? []).length >= requiredIds.length) {
        await service.from('user_learning_paths').update({ completed_at: new Date().toISOString() }).eq('user_id', user.id).eq('learning_path_id', pathId)
        await trackLearningPathCompleted({ supabase, source: 'web', userId: user.id }, { contentId: pathId })
      }
    }
  }

  revalidatePath(`/learning-paths/${pathSlug}`)
}
