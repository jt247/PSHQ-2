'use server'

import { createServiceClient } from '@/lib/supabase/server'
import type { AdminActionLogInsert } from '@/types/database'

/**
 * Writes an immutable audit row to admin_actions_log.
 * Uses the service client to bypass RLS (admin_actions_log is append-only
 * for authenticated admins, but writing from server actions needs service role
 * to avoid per-action RLS policy gaps).
 * Never throws — log failures are non-fatal.
 */
export async function logAdminAction(entry: AdminActionLogInsert): Promise<void> {
  try {
    const service = await createServiceClient()
    await service.from('admin_actions_log').insert(entry)
  } catch {
    // Audit log failure is non-fatal — don't break the main action
  }
}
