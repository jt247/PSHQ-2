'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/admin/log'

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect('/admin')
  return user
}

export async function togglePathwayPublishAction(pathwayId: string, currentStatus: string) {
  const user = await getAdminUser()
  const service = createServiceClient()

  const newStatus = currentStatus === 'published' ? 'coming_soon' : 'published'

  await service.from('curriculum_pathways').update({ status: newStatus }).eq('id', pathwayId)

  await logAdminAction({
    admin_id: user.id, action_type: 'curriculum_pathway_toggle',
    target_table: 'curriculum_pathways', target_id: pathwayId as unknown as string,
    metadata: { previous_status: currentStatus, new_status: newStatus },
  })

  revalidatePath('/admin/initiatives/curriculum')
  revalidatePath('/initiatives/open-pm-curriculum')
}

export async function createStageAction(pathwayId: string, formData: FormData) {
  const user = await getAdminUser()
  const service = createServiceClient()

  const stagePayload = {
    pathway_id: pathwayId,
    title:       formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    stage_order: parseInt(formData.get('stage_order') as string) || 0,
    duration_weeks: formData.get('duration_weeks') ? parseInt(formData.get('duration_weeks') as string) : null,
  }

  const { data: stage, error } = await service
    .from('curriculum_stages')
    .insert(stagePayload)
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await logAdminAction({
    admin_id: user.id, action_type: 'curriculum_stage_create',
    target_table: 'curriculum_stages', target_id: stage.id,
    metadata: { title: stagePayload.title, pathway_id: pathwayId },
  })

  revalidatePath(`/admin/initiatives/curriculum/${pathwayId}`)
}

export async function updateStageAction(stageId: string, formData: FormData) {
  const user = await getAdminUser()
  const service = createServiceClient()

  const stagePayload = {
    title:          formData.get('title') as string,
    description:    (formData.get('description') as string) || null,
    stage_order:    parseInt(formData.get('stage_order') as string) || 0,
    duration_weeks: formData.get('duration_weeks') ? parseInt(formData.get('duration_weeks') as string) : null,
  }

  const { data: stage } = await service
    .from('curriculum_stages')
    .select('pathway_id')
    .eq('id', stageId)
    .single()

  await service.from('curriculum_stages').update(stagePayload).eq('id', stageId)

  await logAdminAction({
    admin_id: user.id, action_type: 'curriculum_stage_update',
    target_table: 'curriculum_stages', target_id: stageId as unknown as string,
    metadata: { title: stagePayload.title },
  })

  if (stage?.pathway_id) {
    revalidatePath(`/admin/initiatives/curriculum/${stage.pathway_id}`)
  }
}

export async function deleteStageAction(stageId: string) {
  const user = await getAdminUser()
  const service = createServiceClient()

  const { data: stage } = await service
    .from('curriculum_stages')
    .select('pathway_id, title')
    .eq('id', stageId)
    .single()

  await service.from('curriculum_stages').delete().eq('id', stageId)

  await logAdminAction({
    admin_id: user.id, action_type: 'curriculum_stage_delete',
    target_table: 'curriculum_stages', target_id: stageId as unknown as string,
    metadata: { title: stage?.title },
  })

  if (stage?.pathway_id) {
    revalidatePath(`/admin/initiatives/curriculum/${stage.pathway_id}`)
  }
}
