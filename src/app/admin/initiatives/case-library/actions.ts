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

export async function createCaseEntryAction(formData: FormData) {
  const user = await getAdminUser()
  const service = createServiceClient()

  const tags = (formData.get('tags') as string || '')
    .split(',').map(t => t.trim()).filter(Boolean)

  const entryPayload = {
    title:         formData.get('title') as string,
    company_name:  formData.get('company_name') as string,
    description:   (formData.get('description') as string) || null,
    thumbnail_url: (formData.get('thumbnail_url') as string) || null,
    tags,
    status:        (formData.get('status') as 'published' | 'draft') ?? 'draft',
    published_at:  formData.get('status') === 'published' ? new Date().toISOString() : null,
    created_by:    user.id,
  }

  const { data: entry, error } = await service
    .from('case_library_entries')
    .insert(entryPayload)
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  // Insert file rows (serialised as JSON array in the form)
  const filesRaw = formData.get('files') as string
  if (filesRaw) {
    const files: { url: string; label: string; type: string }[] = JSON.parse(filesRaw)
    if (files.length > 0) {
      await service.from('case_library_files').insert(
        files.map(f => ({ entry_id: entry.id, file_url: f.url, file_label: f.label || null, file_type: f.type || null }))
      )
    }
  }

  await logAdminAction({
    admin_id: user.id, action_type: 'case_entry_create',
    target_table: 'case_library_entries', target_id: entry.id,
    metadata: { title: entryPayload.title, company_name: entryPayload.company_name, status: entryPayload.status },
  })

  revalidatePath('/admin/initiatives/case-library')
  revalidatePath('/initiatives/product-case-library')
  redirect('/admin/initiatives/case-library')
}

export async function updateCaseEntryAction(id: string, formData: FormData) {
  const user = await getAdminUser()
  const service = createServiceClient()

  const tags = (formData.get('tags') as string || '')
    .split(',').map(t => t.trim()).filter(Boolean)

  const newStatus = formData.get('status') as 'published' | 'draft'

  const { data: existing } = await service
    .from('case_library_entries')
    .select('status, published_at')
    .eq('id', id)
    .single()

  const published_at = newStatus === 'published' && existing?.status !== 'published'
    ? new Date().toISOString()
    : existing?.published_at ?? null

  const entryPayload = {
    title:         formData.get('title') as string,
    company_name:  formData.get('company_name') as string,
    description:   (formData.get('description') as string) || null,
    thumbnail_url: (formData.get('thumbnail_url') as string) || null,
    tags,
    status:        newStatus,
    published_at,
  }

  const { error } = await service.from('case_library_entries').update(entryPayload).eq('id', id)
  if (error) throw new Error(error.message)

  // Replace files if provided
  const filesRaw = formData.get('files') as string
  if (filesRaw !== null) {
    const files: { url: string; label: string; type: string }[] = JSON.parse(filesRaw)
    // Delete old, insert new
    await service.from('case_library_files').delete().eq('entry_id', id)
    if (files.length > 0) {
      await service.from('case_library_files').insert(
        files.map(f => ({ entry_id: id, file_url: f.url, file_label: f.label || null, file_type: f.type || null }))
      )
    }
  }

  await logAdminAction({
    admin_id: user.id, action_type: 'case_entry_update',
    target_table: 'case_library_entries', target_id: id as unknown as string,
    metadata: { status: entryPayload.status },
  })

  revalidatePath('/admin/initiatives/case-library')
  revalidatePath('/initiatives/product-case-library')
  redirect('/admin/initiatives/case-library')
}

export async function archiveCaseEntryAction(id: string) {
  const user = await getAdminUser()
  const service = createServiceClient()

  await service.from('case_library_entries').update({ status: 'draft' }).eq('id', id)

  await logAdminAction({
    admin_id: user.id, action_type: 'case_entry_archive',
    target_table: 'case_library_entries', target_id: id as unknown as string,
    metadata: {},
  })

  revalidatePath('/admin/initiatives/case-library')
  revalidatePath('/initiatives/product-case-library')
}
