'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { uploadFileToR2 } from '@/lib/r2/upload'
import type { UserRow, TicketStatus, TicketPriority } from '@/types/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const profile = p as UserRow | null
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) throw new Error('Forbidden')
  return { supabase, adminId: user.id }
}

// ── Admin reply ───────────────────────────────────────────────

export interface AdminReplyState { error?: string; success?: boolean }

export async function adminReplyAction(
  ticketId: string,
  _prev: AdminReplyState,
  formData: FormData,
): Promise<AdminReplyState> {
  try {
    const { supabase, adminId } = await requireAdmin()

    const body      = (formData.get('body')     as string ?? '').trim()
    const internal  = formData.get('is_internal') === 'true'
    if (!body) return { error: 'Message is required.' }

    let image_url: string | null = null
    const file = formData.get('image') as File | null
    if (file && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) return { error: 'Image must be under 5 MB.' }
      if (!['image/jpeg', 'image/png'].includes(file.type)) return { error: 'Only JPEG and PNG images allowed.' }
      const { url } = await uploadFileToR2(file, 'thumbnails')
      image_url = url
    }

    const { error } = await supabase
      .from('ticket_replies')
      .insert({ ticket_id: ticketId, user_id: adminId, body, is_internal: internal, image_url })

    if (error) return { error: 'Failed to post reply.' }

    revalidatePath(`/admin/support/${ticketId}`)
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Forbidden' }
  }
}

// ── Update ticket status / priority / assignee ────────────────

export async function updateTicketAction(
  ticketId: string,
  updates: { status?: TicketStatus; priority?: TicketPriority; assigned_to?: string | null }
) {
  const { supabase } = await requireAdmin()
  await supabase.from('support_tickets').update(updates).eq('id', ticketId)
  revalidatePath(`/admin/support/${ticketId}`)
  revalidatePath('/admin/support')
}
