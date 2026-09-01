'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@pshq/api-client/server'
import { trackResourceSaved } from '@pshq/analytics'

export async function toggleCollectionSaveAction(collectionId: string, slug: string, isSaved: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (isSaved) {
    await supabase.from('collection_favorites').delete().eq('user_id', user.id).eq('collection_id', collectionId)
  } else {
    await supabase.from('collection_favorites').insert({ user_id: user.id, collection_id: collectionId })
    await trackResourceSaved({ supabase, source: 'web', userId: user.id }, { contentId: collectionId })
  }
  revalidatePath(`/collections/${slug}`)
}
