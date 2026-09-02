'use server'
import { webUrl } from '@/lib/auth/actions'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@pshq/api-client/server'
import { logAdminAction } from '@/lib/admin/log'
import { notifyNewContent } from '@/lib/notifications/notify-new-content'

function requireAdmin(role: string | null) {
  if (!role || !['admin', 'super_admin'].includes(role)) {
    throw new Error('Forbidden')
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createContentAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  requireAdmin(profile?.role ?? null)

  const pricingType = formData.get('pricing_type') as string

  const intent = formData.get('intent') as string
  const status = intent === 'publish' ? 'published' : 'draft'

  const payload = {
    title:           formData.get('title') as string,
    slug:            formData.get('slug') as string,
    type:            formData.get('type') as string,
    status:          status as 'draft' | 'published',
    published_at:    status === 'published' ? new Date().toISOString() : null,
    summary:         (formData.get('summary') as string) || null,
    body:            (formData.get('body') as string) || null,
    cover_image_url: (formData.get('cover_image_url') as string) || null,
    file_url:        (formData.get('file_url') as string) || null,
    tags:            ((formData.get('tags') as string) || '').split(',').map(t => t.trim()).filter(Boolean),
    pricing_type:    pricingType || 'free',
    selar_url:       pricingType === 'paid' ? ((formData.get('selar_url') as string) || null) : null,
    author_id:       user.id,
    ...metadataFields(formData),
  }

  const { data, error } = await supabase.from('content').insert(payload).select('id').single()
  if (error) throw new Error(error.message)

  await syncContentTaxonomy(supabase, data.id, formData)

  await logAdminAction({ admin_id: user.id, action_type: 'content_create', target_table: 'content', target_id: data.id, metadata: { title: payload.title, type: payload.type } })

  if (status === 'published') {
    await notifyNewContent({ id: data.id, title: payload.title, type: payload.type, slug: payload.slug })
  }

  revalidatePath('/content')
  redirect(`/content/${data.id}/edit`)
}

// ─── Epic G §G.5 shared metadata fields ───────────────────────────────────────
// Broken out since both create and update need the exact same parsing.
function metadataFields(formData: FormData) {
  const estMinutes = formData.get('estimated_time_minutes') as string
  return {
    domain:                 (formData.get('domain') as string) || null,
    level:                  (formData.get('level') as string) || null,
    resource_category:      (formData.get('resource_category') as string) || null,
    estimated_time_minutes: estMinutes ? parseInt(estMinutes, 10) : null,
    resource_intent:        formData.getAll('resource_intent').map(String),
    seo_title:              (formData.get('seo_title') as string) || null,
    seo_description:        (formData.get('seo_description') as string) || null,
    canonical_url:          (formData.get('canonical_url') as string) || null,
    og_image_url:           (formData.get('og_image_url') as string) || null,
    series_id:              (formData.get('series_id') as string) || null,
  }
}

// content_topics/content_goals/content_roles are many-to-many join tables
// (Epic B) — the simplest correct sync for a form-driven multi-select is
// delete-all-then-reinsert-selected, scoped to this one content row.
async function syncContentTaxonomy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contentId: string,
  formData: FormData
) {
  const topicIds = formData.getAll('topic_ids').map(String).filter(Boolean)
  const goalIds  = formData.getAll('goal_ids').map(String).filter(Boolean)
  const roleIds  = formData.getAll('role_ids').map(String).filter(Boolean)

  await Promise.all([
    supabase.from('content_topics').delete().eq('content_id', contentId),
    supabase.from('content_goals').delete().eq('content_id', contentId),
    supabase.from('content_roles').delete().eq('content_id', contentId),
  ])

  await Promise.all([
    topicIds.length ? supabase.from('content_topics').insert(topicIds.map(topic_id => ({ content_id: contentId, topic_id }))) : null,
    goalIds.length  ? supabase.from('content_goals').insert(goalIds.map(goal_id => ({ content_id: contentId, goal_id })))    : null,
    roleIds.length  ? supabase.from('content_roles').insert(roleIds.map(role_id => ({ content_id: contentId, role_id })))    : null,
  ])
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateContentAction(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  requireAdmin(profile?.role ?? null)

  const pricingType = formData.get('pricing_type') as string

  const payload = {
    title:           formData.get('title') as string,
    slug:            formData.get('slug') as string,
    type:            formData.get('type') as string,
    summary:         (formData.get('summary') as string) || null,
    body:            (formData.get('body') as string) || null,
    cover_image_url: (formData.get('cover_image_url') as string) || null,
    file_url:        (formData.get('file_url') as string) || null,
    tags:            ((formData.get('tags') as string) || '').split(',').map(t => t.trim()).filter(Boolean),
    pricing_type:    pricingType || 'free',
    selar_url:       pricingType === 'paid' ? ((formData.get('selar_url') as string) || null) : null,
    ...metadataFields(formData),
  }

  const { error } = await supabase.from('content').update(payload).eq('id', id)
  if (error) throw new Error(error.message)

  await syncContentTaxonomy(supabase, id, formData)

  await logAdminAction({ admin_id: user.id, action_type: 'content_update', target_table: 'content', target_id: id, metadata: { title: payload.title } })

  revalidatePath('/content')
  revalidatePath(`/content/${id}/edit`)
}

// ─── Publish / Unpublish ─────────────────────────────────────────────────────

export async function publishContentAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  requireAdmin(profile?.role ?? null)

  const { data, error } = await supabase
    .from('content')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .select('title, type, slug')
    .single()
  if (error) throw new Error(error.message)

  await logAdminAction({ admin_id: user.id, action_type: 'content_publish', target_table: 'content', target_id: id })

  if (data) await notifyNewContent({ id, title: data.title, type: data.type, slug: data.slug })

  revalidatePath('/content')
}

export async function unpublishContentAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  requireAdmin(profile?.role ?? null)

  const { error } = await supabase.from('content').update({ status: 'draft' }).eq('id', id)
  if (error) throw new Error(error.message)

  await logAdminAction({ admin_id: user.id, action_type: 'content_unpublish', target_table: 'content', target_id: id })

  revalidatePath('/content')
}

// ─── Featured (home page spotlight) ──────────────────────────────────────────

export async function toggleFeaturedAction(id: string, featured: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  requireAdmin(profile?.role ?? null)

  const { error } = await supabase.from('content').update({ featured }).eq('id', id)
  if (error) throw new Error(error.message)

  await logAdminAction({ admin_id: user.id, action_type: featured ? 'content_feature' : 'content_unfeature', target_table: 'content', target_id: id })

  revalidatePath('/content')
  revalidatePath('/')
}

// ─── Archive (soft delete — never hard delete) ────────────────────────────────

export async function archiveContentAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  requireAdmin(profile?.role ?? null)

  const { error } = await supabase.from('content').update({ status: 'archived' }).eq('id', id)
  if (error) throw new Error(error.message)

  await logAdminAction({ admin_id: user.id, action_type: 'content_archive', target_table: 'content', target_id: id })

  revalidatePath('/content')
}
