'use server'

import { createServiceClient } from '@pshq/api-client/server'
import { trackAdminAction } from '@pshq/analytics'
import type { AdminActionLogInsert } from '@pshq/database'

/**
 * Writes an immutable audit row to admin_actions_log AND fires the
 * `admin_action` analytics event (Epic G) — the single funnel every admin
 * write in this app goes through, so wiring it here covers every listed
 * write (content publish/archive, suspend/restore, points adjustment,
 * permission change, notification sent, feedback status change) without
 * touching each call site individually.
 * Uses the service client to bypass RLS (admin_actions_log is append-only
 * for authenticated admins, but writing from server actions needs service role
 * to avoid per-action RLS policy gaps).
 * Never throws — log failures are non-fatal.
 */
export async function logAdminAction(entry: AdminActionLogInsert): Promise<void> {
  try {
    const service = createServiceClient()
    await service.from('admin_actions_log').insert(entry)
    await trackAdminAction(
      { supabase: service, source: 'web', userId: entry.admin_id },
      entry.action_type,
      entry.target_table ?? 'unknown',
      entry.target_id,
    )
  } catch {
    // Audit log failure is non-fatal — don't break the main action
  }
}
