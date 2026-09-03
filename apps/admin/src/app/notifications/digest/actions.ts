'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { assembleDigestCandidates } from '@pshq/api-client/digest'
import { sendPushToUsers } from '@pshq/api-client/push'
import { trackDigestSent, trackDigestReturnedToProductSlice } from '@pshq/analytics'
import { resend } from '@/lib/resend/client'
import { logAdminAction } from '@/lib/admin/log'
import { webUrl } from '@/lib/web-url'
import type { UserRow } from '@pshq/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const profile = p as UserRow | null
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) throw new Error('Forbidden')
  return { supabase, adminId: user.id }
}

export interface ActionResult { error?: string; success?: boolean }

// Epic J §J.5-J.6 — real content only, assembled the same way Continue
// From Here is (metadata retrieval, no LLM call, honest nulls). Creates a
// 'draft' row admin then reviews before anything is approved or sent.
export async function createDigestDraftAction(weekOf: string, topicId?: string | null): Promise<ActionResult> {
  try {
    const { adminId } = await requireAdmin()
    const service = createServiceClient()
    const candidates = await assembleDigestCandidates(service, topicId)

    const { error } = await service.from('digest_issues').insert({
      week_of: weekOf,
      status: 'draft',
      insight_content_id: candidates.insight?.id ?? null,
      resource_content_id: candidates.resource?.id ?? null,
      build_note_content_id: candidates.buildNote?.id ?? null,
      community_highlight_type: candidates.communityHighlight ? 'top_contributor' : null,
      community_highlight_user_id: candidates.communityHighlight?.userId ?? null,
      community_highlight_note: candidates.communityHighlight?.note ?? null,
      thing_to_try: candidates.suggestedThingToTry
        ? `Try the "${candidates.suggestedThingToTry.title}" learning path: ${webUrl()}/learning-paths/${candidates.suggestedThingToTry.slug}`
        : null,
      topic_id: topicId ?? null,
      created_by: adminId,
    })
    if (error) return { error: error.message }

    revalidatePath('/notifications/digest')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function updateDigestDraftAction(id: string, fields: { subject?: string; thing_to_try?: string; community_highlight_note?: string }): Promise<ActionResult> {
  try {
    await requireAdmin()
    const service = createServiceClient()
    const { error } = await service.from('digest_issues').update(fields).eq('id', id).eq('status', 'draft')
    if (error) return { error: error.message }
    revalidatePath('/notifications/digest')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function approveDigestAction(id: string): Promise<ActionResult> {
  try {
    const { adminId } = await requireAdmin()
    const service = createServiceClient()
    const { error } = await service.from('digest_issues')
      .update({ status: 'approved', approved_by: adminId, approved_at: new Date().toISOString() })
      .eq('id', id).eq('status', 'draft')
    if (error) return { error: error.message }
    await logAdminAction({ admin_id: adminId, action_type: 'digest_approved', target_table: 'digest_issues', target_id: id })
    revalidatePath('/notifications/digest')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

interface DigestIssueRow {
  id: string; subject: string; status: string; topic_id: string | null
  insight_content_id: string | null; resource_content_id: string | null; build_note_content_id: string | null
  community_highlight_note: string | null; thing_to_try: string | null
}
interface ContentRow { id: string; title: string; slug: string; summary: string | null }

// Explicit admin action, per the PRD: "full automatic sending is a later
// decision" — this only ever runs when an admin clicks Send on an already
// -approved issue.
export async function sendDigestAction(id: string): Promise<ActionResult> {
  try {
    const { adminId } = await requireAdmin()
    const service = createServiceClient()

    const { data: issue } = await service.from('digest_issues').select('*').eq('id', id).eq('status', 'approved').maybeSingle()
    if (!issue) return { error: 'Digest must be approved before sending.' }
    const digest = issue as DigestIssueRow

    const contentIds = [digest.insight_content_id, digest.resource_content_id, digest.build_note_content_id].filter((v): v is string => !!v)
    const { data: contentRows } = contentIds.length > 0
      ? await service.from('content').select('id, title, slug, summary').in('id', contentIds)
      : { data: [] as ContentRow[] }
    const byId = new Map(((contentRows ?? []) as ContentRow[]).map(c => [c.id, c]))

    // Audience: topic-segmented subscribers if the issue has a topic,
    // otherwise every member — excluding anyone who's disabled the digest
    // preference. Same notification_preferences table/key mobile's
    // preferences screen and Epic I's push both already use.
    let userIds: string[]
    if (digest.topic_id) {
      const { data: topicUsers } = await service.from('user_topics').select('user_id').eq('topic_id', digest.topic_id)
      userIds = ((topicUsers ?? []) as Array<{ user_id: string }>).map(r => r.user_id)
    } else {
      const { data: allUsers } = await service.from('users').select('id').eq('role', 'user')
      userIds = ((allUsers ?? []) as Array<{ id: string }>).map(r => r.id)
    }
    if (userIds.length === 0) return { error: 'No members match this digest\'s audience.' }

    const { data: prefs } = await service.from('notification_preferences').select('user_id, enabled').in('user_id', userIds).eq('key', 'weekly_digest_prompt')
    const optedOut = new Set(((prefs ?? []) as Array<{ user_id: string; enabled: boolean }>).filter(p => !p.enabled).map(p => p.user_id))
    const { data: recipients } = await service.from('users').select('id, email').in('id', userIds.filter(id => !optedOut.has(id)))
    const eligible = (recipients ?? []) as Array<{ id: string; email: string }>
    if (eligible.length === 0) return { error: 'Everyone in this digest\'s audience has opted out.' }

    const insight = digest.insight_content_id ? byId.get(digest.insight_content_id) : null
    const resource = digest.resource_content_id ? byId.get(digest.resource_content_id) : null
    const buildNote = digest.build_note_content_id ? byId.get(digest.build_note_content_id) : null

    let sentCount = 0
    for (const member of eligible) {
      const { data: recipientRow, error: recError } = await service
        .from('digest_recipients')
        .upsert({ digest_issue_id: id, user_id: member.id }, { onConflict: 'digest_issue_id,user_id' })
        .select('id, unsubscribe_token')
        .single()
      if (recError || !recipientRow) continue
      const { id: recipientId, unsubscribe_token } = recipientRow as { id: string; unsubscribe_token: string }

      const unsubscribeUrl = `${webUrl()}/api/digest/unsubscribe?token=${unsubscribe_token}`
      const html = renderDigestHtml({ insight, resource, buildNote, communityHighlightNote: digest.community_highlight_note, thingToTry: digest.thing_to_try, webUrl: webUrl(), unsubscribeUrl })

      try {
        const sendResult = await resend.emails.send({
          from: 'ProductSlice Weekly <weekly@productslicehq.com>',
          to: member.email,
          subject: digest.subject,
          html,
        })
        const resendEmailId = sendResult.data?.id ?? null
        await service.from('digest_recipients').update({ delivered_at: new Date().toISOString(), resend_email_id: resendEmailId }).eq('id', recipientId)
        await trackDigestSent({ supabase: service, source: 'web', userId: member.id }, id)
        sentCount++
      } catch {
        // one failed send must not abort the rest of the batch
      }
    }

    await service.from('digest_issues').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id)

    // Mobile push: same weekly_digest_prompt category/preference, real
    // devices only, via the one shared send helper (Epic I).
    await sendPushToUsers(service, {
      userIds: eligible.map(m => m.id),
      category: 'weekly_digest_prompt',
      title: 'ProductSlice Weekly is here',
      body: 'This week: a new insight, a resource, a build note, and a community highlight.',
    })

    await logAdminAction({ admin_id: adminId, action_type: 'digest_sent', target_table: 'digest_issues', target_id: id, metadata: { sentCount } })
    revalidatePath('/notifications/digest')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

function renderDigestHtml(opts: {
  insight: ContentRow | undefined | null; resource: ContentRow | undefined | null; buildNote: ContentRow | undefined | null
  communityHighlightNote: string | null; thingToTry: string | null; webUrl: string; unsubscribeUrl: string
}): string {
  const section = (label: string, item: ContentRow | undefined | null) => item
    ? `<h3 style="margin:24px 0 4px">${label}</h3><p style="margin:0 0 4px"><a href="${opts.webUrl}/content/${item.slug}" style="color:#111827">${item.title}</a></p><p style="margin:0;color:#6b7280;font-size:14px">${item.summary ?? ''}</p>`
    : ''
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="margin-bottom:0">ProductSlice Weekly</h2>
      ${section('One new insight', opts.insight)}
      ${section('One practical resource', opts.resource)}
      ${section('One JT Build Note', opts.buildNote)}
      ${opts.communityHighlightNote ? `<h3 style="margin:24px 0 4px">Community highlight</h3><p style="margin:0">${opts.communityHighlightNote}</p>` : ''}
      ${opts.thingToTry ? `<h3 style="margin:24px 0 4px">One thing to try</h3><p style="margin:0">${opts.thingToTry}</p>` : ''}
      <p style="margin-top:32px;font-size:12px;color:#9ca3af"><a href="${opts.unsubscribeUrl}" style="color:#9ca3af">Unsubscribe from this digest</a></p>
    </div>
  `
}

// On-demand, not automatic — admin triggers this to refresh "returned to
// ProductSlice" for a sent issue. Real analytics_events lookback, same
// data Build Prompt 9's analytics layer reads, not a duplicate tracker.
export async function refreshDigestReturnStatsAction(digestIssueId: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const service = createServiceClient()
    const { data: recipients } = await service.from('digest_recipients').select('id, user_id, delivered_at, returned_at').eq('digest_issue_id', digestIssueId).not('delivered_at', 'is', null).is('returned_at', null)
    for (const r of (recipients ?? []) as Array<{ id: string; user_id: string; delivered_at: string }>) {
      const { data: activity } = await service.from('analytics_events').select('id').eq('user_id', r.user_id).gt('created_at', r.delivered_at).limit(1)
      if (activity && activity.length > 0) {
        await service.from('digest_recipients').update({ returned_at: new Date().toISOString() }).eq('id', r.id)
        await trackDigestReturnedToProductSlice({ supabase: service, source: 'web', userId: r.user_id }, digestIssueId)
      }
    }
    revalidatePath('/notifications/digest')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}
