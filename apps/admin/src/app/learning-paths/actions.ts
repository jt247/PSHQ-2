'use server'
import { webUrl } from '@/lib/auth/actions'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { logAdminAction } from '@/lib/admin/log'

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect('/')
  return user
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function linesToArray(v: FormDataEntryValue | null) {
  return (String(v ?? '')).split('\n').map(s => s.trim()).filter(Boolean)
}

// Epic G §G.6 — replaces Build Prompt 3's seed-file mechanism for the 3
// priority paths and is how the 7 draft stubs (CONTENT-BACKLOG.md) get
// built out for real. Editing an existing seeded path updates the same
// learning_paths row, never re-creates it.
export async function createLearningPathAction(formData: FormData) {
  const user = await getAdminUser()
  const service = createServiceClient()

  const title = formData.get('title') as string
  const payload = {
    title,
    slug:                   (formData.get('slug') as string) || slugify(title),
    description:            (formData.get('description') as string) || null,
    target_audience:        (formData.get('target_audience') as string) || null,
    level:                  (formData.get('level') as string) || null,
    estimated_time_minutes: formData.get('estimated_time_minutes') ? parseInt(formData.get('estimated_time_minutes') as string, 10) : null,
    outcomes:               linesToArray(formData.get('outcomes')),
    prerequisites:          linesToArray(formData.get('prerequisites')),
    status:                 'draft' as const,
  }

  const { data, error } = await service.from('learning_paths').insert(payload).select('id').single()
  if (error) throw new Error(error.message)

  await logAdminAction({ admin_id: user.id, action_type: 'learning_path_create', target_table: 'learning_paths', target_id: data.id, metadata: { title } })
  revalidatePath('/learning-paths')
  redirect(`/learning-paths/${data.id}/edit`)
}

export async function updateLearningPathAction(id: string, formData: FormData) {
  const user = await getAdminUser()
  const service = createServiceClient()

  const title = formData.get('title') as string
  const payload = {
    title,
    slug:                   (formData.get('slug') as string) || slugify(title),
    description:            (formData.get('description') as string) || null,
    target_audience:        (formData.get('target_audience') as string) || null,
    level:                  (formData.get('level') as string) || null,
    estimated_time_minutes: formData.get('estimated_time_minutes') ? parseInt(formData.get('estimated_time_minutes') as string, 10) : null,
    outcomes:               linesToArray(formData.get('outcomes')),
    prerequisites:          linesToArray(formData.get('prerequisites')),
  }

  const { error } = await service.from('learning_paths').update(payload).eq('id', id)
  if (error) throw new Error(error.message)

  await logAdminAction({ admin_id: user.id, action_type: 'learning_path_update', target_table: 'learning_paths', target_id: id, metadata: { title } })
  revalidatePath('/learning-paths')
  revalidatePath(`/learning-paths/${id}/edit`)
}

export async function setLearningPathStatusAction(id: string, status: 'published' | 'draft' | 'archived') {
  const user = await getAdminUser()
  const service = createServiceClient()
  const { error } = await service.from('learning_paths').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
  await logAdminAction({ admin_id: user.id, action_type: `learning_path_${status}`, target_table: 'learning_paths', target_id: id })
  revalidatePath('/learning-paths')
  revalidatePath(`/learning-paths/${id}/edit`)
}

export async function addModuleAction(pathId: string, formData: FormData) {
  const user = await getAdminUser()
  const service = createServiceClient()

  const { count } = await service.from('learning_path_modules').select('id', { count: 'exact', head: true }).eq('learning_path_id', pathId)

  const payload = {
    learning_path_id: pathId,
    content_id:  (formData.get('content_id') as string) || null,
    title:       formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    is_required: formData.get('is_required') === 'on',
    sequence:    count ?? 0,
  }

  const { error } = await service.from('learning_path_modules').insert(payload)
  if (error) throw new Error(error.message)

  await logAdminAction({ admin_id: user.id, action_type: 'learning_path_module_add', target_table: 'learning_path_modules', target_id: pathId, metadata: { title: payload.title } })
  revalidatePath(`/learning-paths/${pathId}/edit`)
}

export async function deleteModuleAction(pathId: string, moduleId: string) {
  const user = await getAdminUser()
  const service = createServiceClient()
  await service.from('learning_path_modules').delete().eq('id', moduleId)
  await logAdminAction({ admin_id: user.id, action_type: 'learning_path_module_delete', target_table: 'learning_path_modules', target_id: moduleId })
  revalidatePath(`/learning-paths/${pathId}/edit`)
}

export async function toggleModuleRequiredAction(pathId: string, moduleId: string, isRequired: boolean) {
  await getAdminUser()
  const service = createServiceClient()
  await service.from('learning_path_modules').update({ is_required: isRequired }).eq('id', moduleId)
  revalidatePath(`/learning-paths/${pathId}/edit`)
}

// Reorder = rewrite the sequence column for every module in the new order
// — simplest correct approach for a handful of modules per path.
export async function reorderModulesAction(pathId: string, orderedModuleIds: string[]) {
  const user = await getAdminUser()
  const service = createServiceClient()
  await Promise.all(orderedModuleIds.map((id, i) => service.from('learning_path_modules').update({ sequence: i }).eq('id', id)))
  await logAdminAction({ admin_id: user.id, action_type: 'learning_path_modules_reorder', target_table: 'learning_path_modules', target_id: pathId })
  revalidatePath(`/learning-paths/${pathId}/edit`)
}
