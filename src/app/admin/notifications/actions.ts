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
  job_role?: string
  country?: string
  interest?: string
  has_purchase?: boolean
  signup_from?: string
  signup_to?: string
}

async function getMatchingUsers(filters: AudienceFilters): Promise<Array<{ id: string; email: string }>> {
  const service = await createServiceClient()
  let query = service.from('users').select('id, email')

  if (filters.job_role) query = query.eq('job_role', filters.job_role)
  if (filters.country)  query = query.eq('country', filters.country)
  if (filters.interest) query = query.contains('areas_of_interest', [filters.interest])
  if (filters.signup_from) query = query.gte('created_at', filters.signup_from)
  if (filters.signup_to)   query = query.lte('created_at', filters.signup_to)

  if (filters.has_purchase === true) {
    const { data: buyers } = await service.from('purchases').select('user_id').eq('status', 'success')
    const ids = [...new Set((buyers ?? []).map(b => b.user_id))]
    if (ids.length === 0) return []
    query = query.in('id', ids)
  } else if (filters.has_purchase === false) {
    const { data: buyers } = await service.from('purchases').select('user_id').eq('status', 'success')
    const ids = [...new Set((buyers ?? []).map(b => b.user_id))]
    if (ids.length > 0) query = query.not('id', 'in', `(${ids.join(',')})`)
  }

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
    const body    = (formData.get('body')    as string ?? '').trim()
    const channel = (formData.get('channel') as string ?? 'in_app') as 'in_app' | 'email' | 'both'
    const type    = 'system' as NotificationType

    if (!title || !body) return { error: 'Title and message are required.' }

    const filters: AudienceFilters = {
      job_role:    (formData.get('filter_job_role') as string) || undefined,
      country:     (formData.get('filter_country')  as string) || undefined,
      interest:    (formData.get('filter_interest') as string) || undefined,
      signup_from: (formData.get('filter_from')     as string) || undefined,
      signup_to:   (formData.get('filter_to')       as string) || undefined,
    }
    const hasPurchaseRaw = formData.get('filter_purchase') as string
    if (hasPurchaseRaw === 'yes') filters.has_purchase = true
    if (hasPurchaseRaw === 'no')  filters.has_purchase = false

    const users = await getMatchingUsers(filters)
    if (users.length === 0) return { error: 'No users match those filters.' }

    const { data: notif, error: nErr } = await supabase
      .from('notifications')
      .insert({ title, body, type, channel, audience_filters: filters as never, created_by: adminId, sent_at: new Date().toISOString() })
      .select('id')
      .single()

    if (nErr || !notif) return { error: 'Failed to create notification.' }

    if (channel === 'in_app' || channel === 'both') {
      const service = await createServiceClient()
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
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2>${title}</h2><p style="line-height:1.6">${body.replace(/\n/g, '<br>')}</p></div>`,
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
