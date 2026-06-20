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

export async function createEditionAction(formData: FormData) {
  const user = await getAdminUser()
  const service = createServiceClient()

  const { data: initiative } = await service
    .from('initiatives')
    .select('id')
    .eq('slug', 'product-lab-with-jt')
    .single()
  if (!initiative) throw new Error('Initiative not found')

  const statsRaw = formData.get('stats') as string
  let stats: Record<string, string | number> = {}
  try { stats = JSON.parse(statsRaw || '{}') } catch { stats = {} }

  const joinMethod = formData.get('join_method') as string
  const payload = {
    initiative_id:     initiative.id,
    edition_number:    formData.get('edition_number') as string,
    title:             formData.get('title') as string,
    focus_description: (formData.get('focus_description') as string) || null,
    status:            formData.get('status') as string,
    join_method:       (joinMethod || null) as 'invitation_email' | 'open' | null,
    join_instructions: (formData.get('join_instructions') as string) || null,
    stats,
    display_order:     parseInt(formData.get('display_order') as string || '0', 10),
  }

  const { data, error } = await service.from('initiative_editions').insert(payload).select('id').single()
  if (error) throw new Error(error.message)

  await logAdminAction({
    admin_id: user.id, action_type: 'initiative_edition_create',
    target_table: 'initiative_editions', target_id: data.id,
    metadata: { edition_number: payload.edition_number, title: payload.title },
  })

  revalidatePath('/admin/initiatives/product-lab')
  revalidatePath('/initiatives/product-lab-with-jt')
  redirect('/admin/initiatives/product-lab')
}

export async function updateEditionAction(id: string, formData: FormData) {
  const user = await getAdminUser()
  const service = createServiceClient()

  const statsRaw = formData.get('stats') as string
  let stats: Record<string, string | number> = {}
  try { stats = JSON.parse(statsRaw || '{}') } catch { stats = {} }

  const joinMethod = formData.get('join_method') as string
  const payload = {
    edition_number:    formData.get('edition_number') as string,
    title:             formData.get('title') as string,
    focus_description: (formData.get('focus_description') as string) || null,
    status:            formData.get('status') as string,
    join_method:       (joinMethod || null) as 'invitation_email' | 'open' | null,
    join_instructions: (formData.get('join_instructions') as string) || null,
    stats,
    display_order:     parseInt(formData.get('display_order') as string || '0', 10),
  }

  const { error } = await service.from('initiative_editions').update(payload).eq('id', id)
  if (error) throw new Error(error.message)

  await logAdminAction({
    admin_id: user.id, action_type: 'initiative_edition_update',
    target_table: 'initiative_editions', target_id: id as unknown as string,
    metadata: { edition_number: payload.edition_number, status: payload.status },
  })

  revalidatePath('/admin/initiatives/product-lab')
  revalidatePath('/initiatives/product-lab-with-jt')
  redirect('/admin/initiatives/product-lab')
}
