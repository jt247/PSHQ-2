import type { SupabaseClient } from '@supabase/supabase-js'
import { trackPushNotificationSent } from '@pshq/analytics'

// Epic I §I.6 — the ONE place that sends a push notification, used by the
// admin Communications Center broadcast action and the achievement-unlock
// route so mobile and any future caller never duplicate Expo's push API
// call (Standing Rule 2). Always call with a service-role client — reading
// other users' push_tokens rows requires it (RLS on push_tokens is
// self-only).

export type PushCategory =
  | 'learning_progress'       // "learning reminder"
  | 'recommended_content'     // "new recommended content"
  | 'product_lab_reminder'    // "Product Lab"
  | 'new_achievement'         // "achievement"
  | 'weekly_digest_prompt'    // dormant until Build Prompt 11 ships the digest itself

interface SendPushInput {
  userIds: string[]
  category: PushCategory
  title: string
  body: string
  data?: Record<string, unknown>
}

interface SendPushResult {
  attempted: number
  sent: number
  skippedNoToken: number
  skippedOptedOut: number
}

/**
 * Sends a push notification to every device token on file for the given
 * users, respecting notification_preferences (same table/keys mobile's
 * preferences screen and the admin broadcast tool already use — no
 * separate push-only preference system, per Standing Rule 2).
 */
export async function sendPushToUsers(service: SupabaseClient, input: SendPushInput): Promise<SendPushResult> {
  const { userIds, category, title, body, data } = input
  if (userIds.length === 0) return { attempted: 0, sent: 0, skippedNoToken: 0, skippedOptedOut: 0 }

  const { data: prefs } = await service
    .from('notification_preferences')
    .select('user_id, enabled')
    .in('user_id', userIds)
    .eq('key', category)
  const optedOut = new Set((prefs ?? []).filter(p => !p.enabled).map(p => p.user_id as string))
  const eligibleIds = userIds.filter(id => !optedOut.has(id))

  if (eligibleIds.length === 0) {
    return { attempted: userIds.length, sent: 0, skippedNoToken: 0, skippedOptedOut: userIds.length }
  }

  const { data: tokenRows } = await service.from('push_tokens').select('user_id, token').in('user_id', eligibleIds)
  const rows = (tokenRows ?? []) as Array<{ user_id: string; token: string }>

  if (rows.length === 0) {
    return { attempted: userIds.length, sent: 0, skippedNoToken: eligibleIds.length, skippedOptedOut: optedOut.size }
  }

  const messages = rows.map(r => ({ to: r.token, title, body, data: { category, ...data } }))
  let sent = 0
  try {
    // Expo's push API accepts up to 100 messages per request.
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100)
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      })
      if (res.ok) sent += chunk.length
    }
  } catch {
    // Push delivery is never allowed to break the feature that triggered
    // it (achievement unlock, admin broadcast) — same posture as
    // packages/analytics' track().
  }

  for (const userId of new Set(rows.map(r => r.user_id))) {
    await trackPushNotificationSent({ supabase: service, source: 'mobile', userId }, { metadata: { category } })
  }

  return {
    attempted: userIds.length,
    sent,
    skippedNoToken: eligibleIds.length - new Set(rows.map(r => r.user_id)).size,
    skippedOptedOut: optedOut.size,
  }
}
