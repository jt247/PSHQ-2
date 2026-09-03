import { webUrl } from '@/lib/web-url'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import type { UserRow } from '@pshq/database'
import { DigestClient } from './client'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'super_admin'].includes((p as UserRow).role)) redirect(`${webUrl()}/dashboard`)
}

interface DigestIssueRow {
  id: string; week_of: string; status: string; subject: string
  insight_content_id: string | null; resource_content_id: string | null; build_note_content_id: string | null
  community_highlight_note: string | null; thing_to_try: string | null; sent_at: string | null
}

// Epic J §J.5/§J.6 — the Weekly ProductSlice Digest review/approval/send
// flow, living inside the Communications Center (Build Prompt 8) rather
// than as a separate admin surface.
export default async function DigestPage() {
  await requireAdmin()
  const service = createServiceClient()

  const [{ data: issues }, { data: topics }] = await Promise.all([
    service.from('digest_issues').select('id, week_of, status, subject, insight_content_id, resource_content_id, build_note_content_id, community_highlight_note, thing_to_try, sent_at').order('week_of', { ascending: false }),
    service.from('topics').select('id, name').order('sort_order'),
  ])

  const contentIds = (issues ?? []).flatMap((i: DigestIssueRow) => [i.insight_content_id, i.resource_content_id, i.build_note_content_id]).filter((v): v is string => !!v)
  const { data: contentRows } = contentIds.length > 0
    ? await service.from('content').select('id, title, slug').in('id', contentIds)
    : { data: [] as Array<{ id: string; title: string; slug: string }> }

  const recipientCounts = new Map<string, { delivered: number; opened: number; clicked: number; unsubscribed: number; returned: number }>()
  if ((issues ?? []).some((i: DigestIssueRow) => i.status === 'sent')) {
    const sentIds = (issues ?? []).filter((i: DigestIssueRow) => i.status === 'sent').map((i: DigestIssueRow) => i.id)
    const { data: recipientRows } = await service.from('digest_recipients').select('digest_issue_id, delivered_at, opened_at, clicked_at, unsubscribed_at, returned_at').in('digest_issue_id', sentIds)
    for (const r of (recipientRows ?? []) as Array<{ digest_issue_id: string; delivered_at: string | null; opened_at: string | null; clicked_at: string | null; unsubscribed_at: string | null; returned_at: string | null }>) {
      const c = recipientCounts.get(r.digest_issue_id) ?? { delivered: 0, opened: 0, clicked: 0, unsubscribed: 0, returned: 0 }
      if (r.delivered_at) c.delivered++
      if (r.opened_at) c.opened++
      if (r.clicked_at) c.clicked++
      if (r.unsubscribed_at) c.unsubscribed++
      if (r.returned_at) c.returned++
      recipientCounts.set(r.digest_issue_id, c)
    }
  }

  return (
    <DigestClient
      issues={(issues ?? []) as DigestIssueRow[]}
      contentTitles={Object.fromEntries(((contentRows ?? []) as Array<{ id: string; title: string; slug: string }>).map(c => [c.id, c]))}
      topics={(topics ?? []) as Array<{ id: string; name: string }>}
      recipientCounts={Object.fromEntries(recipientCounts)}
    />
  )
}
