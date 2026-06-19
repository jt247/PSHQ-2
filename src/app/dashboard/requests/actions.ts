'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface RequestState { error?: string; success?: boolean }

export async function createRequestAction(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to submit a request.' }

  const title  = (formData.get('title')       as string ?? '').trim()
  const description = (formData.get('description') as string ?? '').trim() || null
  const content_type_requested = (formData.get('content_type_requested') as string ?? '').trim() || null

  if (!title || title.length < 5) return { error: 'Title must be at least 5 characters.' }

  const { error } = await supabase
    .from('content_requests')
    .insert({ user_id: user.id, title, description, content_type_requested })

  if (error) return { error: 'Failed to submit request.' }

  revalidatePath('/dashboard/requests')
  return { success: true }
}
