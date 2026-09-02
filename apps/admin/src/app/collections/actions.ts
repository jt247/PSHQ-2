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

// Epic G §G.7 — this is where the 4 collections deliberately left out of
// Epic B's seed (CONTENT-BACKLOG.md: Product Strategy Essentials, Founder
// 0→1 Toolkit, Technical PM Starter Pack, Product Leadership Essentials)
// get built for real whenever JT has content ready, same pattern as the 3
// that shipped.
export async function createCollectionAction(formData: FormData) {
  const user = await getAdminUser()
  const service = createServiceClient()

  const title = formData.get('title') as string
  const payload = {
    title,
    slug: (formData.get('slug') as string) || slugify(title),
    description: (formData.get('description') as string) || null,
    cover_image_url: (formData.get('cover_image_url') as string) || null,
    status: 'draft' as const,
  }

  const { data, error } = await service.from('collections').insert(payload).select('id').single()
  if (error) throw new Error(error.message)

  await logAdminAction({ admin_id: user.id, action_type: 'collection_create', target_table: 'collections', target_id: data.id, metadata: { title } })
  revalidatePath('/collections')
  redirect(`/collections/${data.id}/edit`)
}

export async function updateCollectionAction(id: string, formData: FormData) {
  const user = await getAdminUser()
  const service = createServiceClient()

  const title = formData.get('title') as string
  const payload = {
    title,
    slug: (formData.get('slug') as string) || slugify(title),
    description: (formData.get('description') as string) || null,
    cover_image_url: (formData.get('cover_image_url') as string) || null,
  }

  const { error } = await service.from('collections').update(payload).eq('id', id)
  if (error) throw new Error(error.message)

  await logAdminAction({ admin_id: user.id, action_type: 'collection_update', target_table: 'collections', target_id: id, metadata: { title } })
  revalidatePath('/collections')
  revalidatePath(`/collections/${id}/edit`)
}

export async function setCollectionStatusAction(id: string, status: 'published' | 'draft' | 'archived') {
  const user = await getAdminUser()
  const service = createServiceClient()
  const { error } = await service.from('collections').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
  await logAdminAction({ admin_id: user.id, action_type: `collection_${status}`, target_table: 'collections', target_id: id })
  revalidatePath('/collections')
  revalidatePath(`/collections/${id}/edit`)
}

export async function addCollectionItemAction(collectionId: string, contentId: string) {
  const user = await getAdminUser()
  const service = createServiceClient()
  const { count } = await service.from('collection_items').select('id', { count: 'exact', head: true }).eq('collection_id', collectionId)
  const { error } = await service.from('collection_items').insert({ collection_id: collectionId, content_id: contentId, display_order: count ?? 0 })
  if (error) throw new Error(error.message)
  await logAdminAction({ admin_id: user.id, action_type: 'collection_item_add', target_table: 'collection_items', target_id: collectionId, metadata: { contentId } })
  revalidatePath(`/collections/${collectionId}/edit`)
}

export async function removeCollectionItemAction(collectionId: string, itemId: string) {
  const user = await getAdminUser()
  const service = createServiceClient()
  await service.from('collection_items').delete().eq('id', itemId)
  await logAdminAction({ admin_id: user.id, action_type: 'collection_item_remove', target_table: 'collection_items', target_id: itemId })
  revalidatePath(`/collections/${collectionId}/edit`)
}

export async function reorderCollectionItemsAction(collectionId: string, orderedItemIds: string[]) {
  const user = await getAdminUser()
  const service = createServiceClient()
  await Promise.all(orderedItemIds.map((id, i) => service.from('collection_items').update({ display_order: i }).eq('id', id)))
  await logAdminAction({ admin_id: user.id, action_type: 'collection_items_reorder', target_table: 'collection_items', target_id: collectionId })
  revalidatePath(`/collections/${collectionId}/edit`)
}
