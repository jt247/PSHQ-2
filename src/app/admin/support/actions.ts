'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { uploadFileToR2 } from '@/lib/r2/upload'
import { logAdminAction } from '@/lib/admin/log'
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

    const body     = (formData.get('body') as string ?? '').trim()
    const internal = formData.get('is_internal') === 'true'
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

    await logAdminAction({ admin_id: adminId, action_type: internal ? 'ticket_internal_note' : 'ticket_reply', target_table: 'support_tickets', target_id: ticketId })

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
  const { supabase, adminId } = await requireAdmin()
  await supabase.from('support_tickets').update(updates).eq('id', ticketId)

  const actionType = updates.status ? `ticket_status_${updates.status}` : updates.assigned_to !== undefined ? 'ticket_assigned' : 'ticket_update'
  await logAdminAction({ admin_id: adminId, action_type: actionType, target_table: 'support_tickets', target_id: ticketId, metadata: updates as never })

  revalidatePath(`/admin/support/${ticketId}`)
  revalidatePath('/admin/support')
}

// ── Admin-created ticket / contact inquiry ────────────────────

export interface CreateTicketState { error?: string; success?: boolean; id?: string }

export async function createTicketAction(
  _prev: CreateTicketState,
  formData: FormData,
): Promise<CreateTicketState> {
  try {
    const { supabase, adminId } = await requireAdmin()
    const service = createServiceClient()

    const name        = (formData.get('name')        as string ?? '').trim()
    const email       = (formData.get('email')       as string ?? '').trim()
    const subject     = (formData.get('subject')     as string ?? '').trim()
    const description = (formData.get('description') as string ?? '').trim()
    const priority    = (formData.get('priority')    as string ?? 'medium') as TicketPriority

    if (!email || !subject || !description) return { error: 'Email, subject, and description are required.' }

    // Ticket number: count + 1
    const { count } = await service.from('support_tickets').select('id', { count: 'exact', head: true })
    const ticket_number = (count ?? 0) + 1

    const { data, error } = await service.from('support_tickets').insert({
      ticket_number,
      subject,
      description,
      email,
      priority,
      status: 'open',
      assigned_to: adminId,
      // user_id intentionally null — this is an admin-created contact inquiry
    }).select('id').single()

    if (error || !data) return { error: 'Failed to create ticket.' }

    if (name) {
      await service.from('ticket_replies').insert({
        ticket_id: data.id,
        user_id: adminId,
        body: `Contact name: ${name}`,
        is_internal: true,
      })
    }

    await logAdminAction({ admin_id: adminId, action_type: 'ticket_create_admin', target_table: 'support_tickets', target_id: data.id, metadata: { subject, email } })

    revalidatePath('/admin/support')
    return { success: true, id: data.id }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}
