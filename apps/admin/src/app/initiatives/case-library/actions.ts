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

// Every field in Epic B's case content model (§B.11) — was previously only
// editable by hand-editing the migration/Supabase directly, since the form
// only ever exposed title/company/description/tags/status/thumbnail/files.
const ANALYSIS_FIELDS = [
  'slug', 'logo_url', 'industry', 'market', 'country', 'stage', 'product', 'problem',
  'target_customer', 'market_context', 'business_model', 'product_strategy', 'acquisition',
  'activation', 'retention', 'revenue', 'distribution', 'competitive_advantage',
  'key_product_decisions', 'what_worked', 'what_did_not_work', 'challenges', 'jt_analysis',
  'what_i_would_do_differently',
] as const

function analysisFields(formData: FormData) {
  const out: Record<string, string | null> = {}
  for (const f of ANALYSIS_FIELDS) out[f] = (formData.get(f) as string) || null
  return out
}

function arrayField(formData: FormData, key: string) {
  return ((formData.get(key) as string) || '').split('\n').map(s => s.trim()).filter(Boolean)
}

export async function createCaseEntryAction(formData: FormData) {
  const user = await getAdminUser()
  const service = createServiceClient()

  const tags = (formData.get('tags') as string || '')
    .split(',').map(t => t.trim()).filter(Boolean)

  const titleValue = formData.get('title') as string
  const rawSlug = (formData.get('slug') as string) || slugify(titleValue)

  const entryPayload = {
    title:         titleValue,
    company_name:  formData.get('company_name') as string,
    description:   (formData.get('description') as string) || null,
    thumbnail_url: (formData.get('thumbnail_url') as string) || null,
    tags,
    status:        (formData.get('status') as 'published' | 'draft') ?? 'draft',
    published_at:  formData.get('status') === 'published' ? new Date().toISOString() : null,
    created_by:    user.id,
    ...analysisFields(formData),
    slug:                   rawSlug,
    key_lessons:            arrayField(formData, 'key_lessons'),
    discussion_questions:   arrayField(formData, 'discussion_questions'),
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

  revalidatePath('/initiatives/case-library')
  revalidatePath('/initiatives/product-case-library')
  redirect('/initiatives/case-library')
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
    ...analysisFields(formData),
    slug:                 (formData.get('slug') as string) || slugify(formData.get('title') as string),
    key_lessons:          arrayField(formData, 'key_lessons'),
    discussion_questions: arrayField(formData, 'discussion_questions'),
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

  revalidatePath('/initiatives/case-library')
  revalidatePath('/initiatives/product-case-library')
  redirect('/initiatives/case-library')
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

  revalidatePath('/initiatives/case-library')
  revalidatePath('/initiatives/product-case-library')
}
