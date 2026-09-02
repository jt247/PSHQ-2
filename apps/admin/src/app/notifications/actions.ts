'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { sendPushToUsers, type PushCategory } from '@pshq/api-client/push'
import { resend } from '@/lib/resend/client'
import { logAdminAction } from '@/lib/admin/log'
import type { UserRow, NotificationType } from '@pshq/database'

const PUSH_CATEGORIES: PushCategory[] = ['learning_progress', 'recommended_content', 'product_lab_reminder', 'weekly_digest_prompt']

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
  engagement_status?: 'new' | 'inactive'
  learning_path_id?: string
}

// Epic G §G.10 — respects notification_preferences (Build Prompt 5's
// member-side controls) before ever including a user in a send, plus adds
// the engagement-status and learning-path segmentation axes the prompt
// asks for on top of the existing job_role/country/interests/signup-range
// filters already shipped.
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

  if (filters.engagement_status === 'new') {
    query = query.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  }
  if (filters.engagement_status === 'inactive') {
    // "Inactive" interim definition (Build Prompt 9/Epic H replaces this
    // with the exact spec) — no analytics_events row in 30 days.
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentlyActive } = await service.from('analytics_events').select('user_id').gte('created_at', cutoff).not('user_id', 'is', null)
    const activeIds = new Set((recentlyActive ?? []).map(r => r.user_id))
    query = query.not('id', 'in', `(${[...activeIds].join(',') || '00000000-0000-0000-0000-000000000000'})`)
  }

  if (filters.learning_path_id) {
    const { data: enrolled } = await service.from('user_learning_paths').select('user_id').eq('learning_path_id', filters.learning_path_id)
    const ids = (enrolled ?? []).map(e => e.user_id)
    if (ids.length === 0) return []
    query = query.in('id', ids)
  }

  const { data: candidates } = await query
  const users = (candidates ?? []) as Array<{ id: string; email: string }>
  if (users.length === 0) return []

  // notification_preferences keys are content-category based (Build
  // Prompt 5: recommended_content, product_announcement, etc.), not
  // channel-based — an admin broadcast is a "system announcement", so the
  // matching category is 'product_announcement'. A user with that key
  // explicitly disabled is excluded from every admin broadcast regardless
  // of channel.
  const { data: prefs } = await service.from('notification_preferences').select('user_id, enabled').in('user_id', users.map(u => u.id)).eq('key', 'product_announcement')
  const optedOut = new Set((prefs ?? []).filter(p => !p.enabled).map(p => p.user_id))

  return users.filter(u => !optedOut.has(u.id))
}

export interface BroadcastState { error?: string; success?: boolean; sentTo?: number; pushSent?: number }

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

    const engagementStatus = (formData.get('engagement_status') as string) || undefined
    const learningPathId = (formData.get('learning_path_id') as string) || undefined

    const filters: AudienceFilters = {
      job_roles:   jobRoles.length   ? jobRoles   : undefined,
      countries:   countries.length  ? countries  : undefined,
      interests:   interests.length  ? interests  : undefined,
      signup_from,
      signup_to,
      engagement_status: engagementStatus === 'new' || engagementStatus === 'inactive' ? engagementStatus : undefined,
      learning_path_id: learningPathId,
    }

    const users = await getMatchingUsers(filters)
    if (users.length === 0) return { error: 'No users match those filters (or all matches opted out of this channel).' }

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

    let pushSent: number | undefined
    const pushCategoryRaw = (formData.get('push_category') as string) || ''
    if (PUSH_CATEGORIES.includes(pushCategoryRaw as PushCategory)) {
      const pushCategory = pushCategoryRaw as PushCategory
      const service = createServiceClient()
      const result = await sendPushToUsers(service, {
        userIds: users.map(u => u.id),
        category: pushCategory,
        title,
        body: message,
      })
      pushSent = result.sent
    }

    await logAdminAction({ admin_id: adminId, action_type: 'notification_broadcast', target_table: 'notifications', target_id: notif.id, metadata: { title, channel, sentTo: users.length, pushCategory: pushCategoryRaw || null, pushSent } })

    revalidatePath('/notifications')
    return { success: true, sentTo: users.length, pushSent }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}
