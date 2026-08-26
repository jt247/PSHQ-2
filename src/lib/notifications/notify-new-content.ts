import { createServiceClient } from '@/lib/supabase/server'

const TYPE_LABELS: Record<string, string> = {
  article: 'article',
  ebook: 'ebook',
  template: 'template',
  course: 'course',
}

interface NewContentNotice {
  id: string
  title: string
  type: string
  slug: string
}

/**
 * Fans out an in-app notification to every registered user when new content
 * is published. Reuses the same notifications/notification_recipients tables
 * as the admin broadcast tool (src/app/admin/notifications/actions.ts) —
 * this is just an automatic, unfiltered, in_app-only broadcast triggered by
 * publish instead of an admin filling out a form.
 *
 * Email is deliberately left out here — see SIDENOTES.md 2026-08-26 entry.
 * Never throws: a notification failure must not block content publishing.
 */
export async function notifyNewContent(content: NewContentNotice): Promise<void> {
  try {
    const service = createServiceClient()
    const label = TYPE_LABELS[content.type] ?? 'resource'

    const { data: notif, error: notifError } = await service
      .from('notifications')
      .insert({
        title: `New ${label}: ${content.title}`,
        body: `A new ${label} just went live on Product Slice HQ.`,
        type: 'content',
        channel: 'in_app',
        action_url: content.type === 'article' ? `/articles/${content.slug}` : `/content/${content.slug}`,
        sent_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (notifError || !notif) return

    const { data: users } = await service.from('users').select('id')
    const rows = (users ?? []).map(u => ({ notification_id: notif.id, user_id: u.id }))
    for (let i = 0; i < rows.length; i += 100) {
      await service.from('notification_recipients').insert(rows.slice(i, i + 100))
    }
  } catch {
    // Non-fatal — publishing content must succeed even if notifications fail.
  }
}
