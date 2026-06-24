'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend/client'
import { logAdminAction } from '@/lib/admin/log'
import type { UserRow, NotificationType } from '@/types/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const profile = p as UserRow | null
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) throw new Error('Forbidden')
  return { supabase, adminId: user.id }
}

interface AudienceFilters {
  job_roles?: string[]
  countries?: string[]
  interests?: string[]
  signup_from?: string
  signup_to?: string
}

async function getMatchingUsers(filters: AudienceFilters): Promise<Array<{ id: string; email: string }>> {
  const service = createServiceClient()
  let query = service.from('users').select('id, email')

  if (filters.job_roles?.length)  query = query.in('job_role', filters.job_roles)
  if (filters.countries?.length)  query = query.in('country', filters.countries)
  if (filters.interests?.length) {
    for (const interest of filters.interests) {
      query = query.contains('areas_of_interest', [interest])
    }
  }
  if (filters.signup_from) query = query.gte('created_at', filters.signup_from)
  if (filters.signup_to)   query = query.lte('created_at', filters.signup_to)

  const { data } = await query
  return (data ?? []) as Array<{ id: string; email: string }>
}

export interface BroadcastState { error?: string; success?: boolean; sentTo?: number }

export async function broadcastNotificationAction(
  _prev: BroadcastState,
  formData: FormData,
): Promise<BroadcastState> {
  try {
    const { supabase, adminId } = await requireAdmin()

    const title   = (formData.get('title')   as string ?? '').trim()
    const message = (formData.get('message') as string ?? '').trim()
    const channel = (formData.get('channel') as string ?? 'in_app') as 'in_app' | 'email' | 'both'
    const type    = 'system' as NotificationType

    if (!title || !message) return { error: 'Title and message are required.' }

    // Multi-value selects send comma-separated or multiple entries
    const jobRoles  = formData.getAll('job_roles').map(v => String(v)).filter(Boolean)
    const countries = formData.getAll('countries').map(v => String(v)).filter(Boolean)
    const interests = formData.getAll('interests').map(v => String(v)).filter(Boolean)

    // Date range from preset or custom
    const dayRange     = formData.get('day_range') as string
    const customFrom   = formData.get('signup_after') as string
    const customTo     = formData.get('signup_before') as string

    let signup_from: string | undefined
    let signup_to: string | undefined

    if (dayRange && dayRange !== 'all') {
      const hours = parseInt(dayRange, 10)
      if (!isNaN(hours)) {
        signup_from = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      }
    } else if (dayRange === 'custom') {
      if (customFrom) signup_from = new Date(customFrom).toISOString()
      if (customTo)   signup_to   = new Date(customTo).toISOString()
    }

    const filters: AudienceFilters = {
      job_roles:   jobRoles.length   ? jobRoles   : undefined,
      countries:   countries.length  ? countries  : undefined,
      interests:   interests.length  ? interests  : undefined,
      signup_from,
      signup_to,
    }

    const users = await getMatchingUsers(filters)
    if (users.length === 0) return { error: 'No users match those filters.' }

    const { data: notif, error: nErr } = await supabase
      .from('notifications')
      .insert({ title, body: message, type, channel, audience_filters: filters as never, created_by: adminId, sent_at: new Date().toISOString() })
      .select('id')
      .single()

    if (nErr || !notif) return { error: 'Failed to create notification.' }

    if (channel === 'in_app' || channel === 'both') {
      const service = createServiceClient()
      const rows = users.map(u => ({ notification_id: notif.id, user_id: u.id }))
      for (let i = 0; i < rows.length; i += 100) {
        await service.from('notification_recipients').insert(rows.slice(i, i + 100))
      }
    }

    if (channel === 'email' || channel === 'both') {
      const emailList = users.map(u => u.email).filter(Boolean)
      for (let i = 0; i < emailList.length; i += 50) {
        await resend.emails.send({
          from: 'PSHQ <noreply@productslicehq.com>',
          to: emailList.slice(i, i + 50),
          subject: title,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2>${title}</h2><p style="line-height:1.6">${message.replace(/\n/g, '<br>')}</p></div>`,
        }).catch(() => null)
      }
    }

    await logAdminAction({ admin_id: adminId, action_type: 'notification_broadcast', target_table: 'notifications', target_id: notif.id, metadata: { title, channel, sentTo: users.length } })

    revalidatePath('/admin/notifications')
    return { success: true, sentTo: users.length }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}
