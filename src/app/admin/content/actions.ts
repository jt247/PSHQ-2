'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/admin/log'

function requireAdmin(role: string | null) {
  if (!role || !['admin', 'super_admin'].includes(role)) {
    throw new Error('Forbidden')
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createContentAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  requireAdmin(profile?.role ?? null)

  const pricingType = formData.get('pricing_type') as string

  const payload = {
    title:           formData.get('title') as string,
    slug:            formData.get('slug') as string,
    type:            formData.get('type') as string,
    status:          'draft' as const,
    summary:         (formData.get('summary') as string) || null,
    body:            (formData.get('body') as string) || null,
    cover_image_url: (formData.get('cover_image_url') as string) || null,
    file_url:        (formData.get('file_url') as string) || null,
    tags:            ((formData.get('tags') as string) || '').split(',').map(t => t.trim()).filter(Boolean),
    pricing_type:    pricingType || 'free',
    selar_url:       pricingType === 'paid' ? ((formData.get('selar_url') as string) || null) : null,
    author_id:       user.id,
  }

  const { data, error } = await supabase.from('content').insert(payload).select('id').single()
  if (error) throw new Error(error.message)

  await logAdminAction({ admin_id: user.id, action_type: 'content_create', target_table: 'content', target_id: data.id, metadata: { title: payload.title, type: payload.type } })

  revalidatePath('/admin/content')
  redirect(`/admin/content/${data.id}/edit`)
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateContentAction(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

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
  }

  const { error } = await supabase.from('content').update(payload).eq('id', id)
  if (error) throw new Error(error.message)

  await logAdminAction({ admin_id: user.id, action_type: 'content_update', target_table: 'content', target_id: id, metadata: { title: payload.title } })

  revalidatePath('/admin/content')
  revalidatePath(`/admin/content/${id}/edit`)
}

// ─── Publish / Unpublish ─────────────────────────────────────────────────────

export async function publishContentAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  requireAdmin(profile?.role ?? null)

  const { error } = await supabase
    .from('content')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)

  await logAdminAction({ admin_id: user.id, action_type: 'content_publish', target_table: 'content', target_id: id })

  revalidatePath('/admin/content')
}

export async function unpublishContentAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  requireAdmin(profile?.role ?? null)

  const { error } = await supabase.from('content').update({ status: 'draft' }).eq('id', id)
  if (error) throw new Error(error.message)

  await logAdminAction({ admin_id: user.id, action_type: 'content_unpublish', target_table: 'content', target_id: id })

  revalidatePath('/admin/content')
}

// ─── Archive (soft delete — never hard delete) ────────────────────────────────

export async function archiveContentAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  requireAdmin(profile?.role ?? null)

  const { error } = await supabase.from('content').update({ status: 'archived' }).eq('id', id)
  if (error) throw new Error(error.message)

  await logAdminAction({ admin_id: user.id, action_type: 'content_archive', target_table: 'content', target_id: id })

  revalidatePath('/admin/content')
}
