'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export interface ProfileState {
  error?: string
  success?: boolean
}


export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const first_name = (formData.get('first_name') as string ?? '').trim()
  const last_name  = (formData.get('last_name')  as string ?? '').trim()
  const job_role   = (formData.get('job_role')   as string ?? '').trim()
  const country    = (formData.get('country')    as string ?? '').trim()
  const bio        = (formData.get('bio')        as string ?? '').trim() || null
  const areasRaw   = formData.getAll('areas_of_interest') as string[]
  const areas_of_interest = areasRaw.slice(0, 7)

  const full_name = [first_name, last_name].filter(Boolean).join(' ') || null

  const service = createServiceClient()
  const { error } = await service
    .from('users')
    .update({ first_name, last_name, full_name, job_role, country, bio, areas_of_interest })
    .eq('id', user.id)

  if (error) return { error: 'Failed to save profile. Try again.' }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function sendPasswordResetAction(): Promise<ProfileState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'No email on account.' }

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  })

  if (error) return { error: error.message }
  return { success: true }
}
