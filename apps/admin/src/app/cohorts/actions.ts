'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { trackCohortAssigned } from '@pshq/analytics'
import { logAdminAction } from '@/lib/admin/log'
import type { UserRow } from '@pshq/database'
import type { Cohort } from '@pshq/api-client/cohorts'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const profile = p as UserRow | null
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) throw new Error('Forbidden')
  return { supabase, adminId: user.id }
}

export interface ActionResult { error?: string; success?: boolean; count?: number }

// Epic J §J.1-J.4 — assigns a REAL, already-signed-up member (found by
// exact email) to a cohort. This never creates a user; it only tags one
// that already exists.
export async function assignExistingUserToCohortAction(email: string, cohort: Cohort): Promise<ActionResult> {
  try {
    const { adminId } = await requireAdmin()
    const service = createServiceClient()

    const { data: user } = await service.from('users').select('id').ilike('email', email.trim()).maybeSingle()
    if (!user) return { error: `No member found with email ${email}. Use "Invite by email" instead if they haven't signed up yet.` }

    const { error } = await service.rpc('assign_cohort', { p_user_id: (user as { id: string }).id, p_cohort: cohort })
    if (error) return { error: error.message }

    await trackCohortAssigned({ supabase: service, source: 'web', userId: (user as { id: string }).id }, cohort)
    await logAdminAction({ admin_id: adminId, action_type: 'cohort_assigned', target_table: 'cohort_memberships', target_id: (user as { id: string }).id, metadata: { cohort } })

    revalidatePath('/cohorts')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function removeCohortAction(userId: string, cohort: Cohort): Promise<ActionResult> {
  try {
    await requireAdmin()
    const service = createServiceClient()
    const { error } = await service.rpc('remove_cohort', { p_user_id: userId, p_cohort: cohort })
    if (error) return { error: error.message }
    revalidatePath('/cohorts')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

// Bulk invite — real email addresses JT pastes in (his workshop database
// export, a CSV, whatever he has), never fabricated. Nothing here creates
// an account; it just queues a cohort tag that activates the moment that
// email signs up (see consume_cohort_invites, called from the auth
// callback). Emails that already belong to a signed-up member are
// assigned immediately instead of queued, since there's no signup left to
// wait for.
export async function bulkInviteToCohortAction(rawEmails: string, cohort: Cohort): Promise<ActionResult> {
  try {
    const { adminId } = await requireAdmin()
    const service = createServiceClient()

    const emails = Array.from(new Set(
      rawEmails.split(/[\n,;]+/).map(e => e.trim().toLowerCase()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    ))
    if (emails.length === 0) return { error: 'No valid email addresses found.' }

    const { data: existing } = await service.from('users').select('id, email').in('email', emails)
    const existingByEmail = new Map(((existing ?? []) as Array<{ id: string; email: string }>).map(u => [u.email.toLowerCase(), u.id]))

    let assigned = 0
    let queued = 0
    for (const email of emails) {
      const existingId = existingByEmail.get(email)
      if (existingId) {
        await service.rpc('assign_cohort', { p_user_id: existingId, p_cohort: cohort })
        await trackCohortAssigned({ supabase: service, source: 'web', userId: existingId }, cohort)
        assigned++
      } else {
        const { error } = await service.from('cohort_invites').upsert(
          { email, cohort, invited_by: adminId },
          { onConflict: 'email,cohort' }
        )
        if (!error) queued++
      }
    }

    await logAdminAction({ admin_id: adminId, action_type: 'cohort_bulk_invite', target_table: 'cohort_invites', target_id: null, metadata: { cohort, assigned, queued } })
    revalidatePath('/cohorts')
    return { success: true, count: assigned + queued }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}
