'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { uploadFileToR2 } from '@/lib/r2/upload'

// ── Create ticket (authenticated user) ───────────────────────

export interface TicketState { error?: string; success?: boolean; ticketId?: string }

export async function createTicketAction(_prev: TicketState, formData: FormData): Promise<TicketState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to submit a ticket.' }

  const subject     = (formData.get('subject')     as string ?? '').trim()
  const description = (formData.get('description') as string ?? '').trim()
  const content_id  = (formData.get('content_id')  as string ?? '').trim() || null

  if (!subject) return { error: 'Subject is required.' }
  if (!description) return { error: 'Message is required.' }

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({ user_id: user.id, subject, description, content_id })
    .select('id')
    .single()

  if (error || !data) return { error: 'Failed to create ticket.' }

  revalidatePath('/dashboard/support')
  return { success: true, ticketId: data.id }
}

// ── Reply to ticket (authenticated user) ─────────────────────

export interface ReplyState { error?: string; success?: boolean }

export async function postUserReplyAction(
  ticketId: string,
  _prev: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Verify ticket belongs to user
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id')
    .eq('id', ticketId)
    .eq('user_id', user.id)
    .single()
  if (!ticket) return { error: 'Ticket not found.' }

  const body = (formData.get('body') as string ?? '').trim()
  if (!body) return { error: 'Message is required.' }

  // Optional image upload
  let image_url: string | null = null
  const file = formData.get('image') as File | null
  if (file && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return { error: 'Image must be under 5 MB.' }
    if (!['image/jpeg', 'image/png'].includes(file.type)) return { error: 'Only JPEG and PNG images allowed.' }
    try {
      const { url } = await uploadFileToR2(file, 'thumbnails')
      image_url = url
    } catch {
      return { error: 'Image upload failed.' }
    }
  }

  const { error } = await supabase
    .from('ticket_replies')
    .insert({ ticket_id: ticketId, user_id: user.id, body, image_url, is_internal: false })

  if (error) return { error: 'Failed to post reply.' }

  revalidatePath(`/dashboard/support/${ticketId}`)
  return { success: true }
}
