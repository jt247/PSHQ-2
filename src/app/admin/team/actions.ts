'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend/client'
import { logAdminAction } from '@/lib/admin/log'
import type { UserRow, TeamRole } from '@/types/database'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const profile = p as Pick<UserRow, 'role'> | null
  if (profile?.role !== 'super_admin') throw new Error('Forbidden')
  return { supabase, adminId: user.id }
}

// ── Invite new admin ──────────────────────────────────────────────────────────

export interface InviteState { error?: string; success?: boolean }

export async function inviteAdminAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  try {
    const { adminId } = await requireSuperAdmin()
    const service = await createServiceClient()

    const email    = (formData.get('email')     as string ?? '').trim().toLowerCase()
    const teamRole = (formData.get('team_role') as string ?? '').trim() as TeamRole

    if (!email || !teamRole) return { error: 'Email and team role are required.' }
    if (!['product', 'support', 'growth'].includes(teamRole)) return { error: 'Invalid team role.' }

    // Check if already an admin
    const { data: existing } = await service.from('users').select('id, role').eq('email', email).single()
    if (existing && ['admin', 'super_admin'].includes((existing as UserRow).role)) {
      return { error: 'This email already has admin access.' }
    }

    // Create or refresh invite (upsert by email — one pending invite per email)
    const { data: invite, error: inviteErr } = await service
      .from('admin_invites')
      .insert({ email, team_role: teamRole, invited_by: adminId })
      .select('token')
      .single()

    if (inviteErr || !invite) return { error: 'Failed to create invite.' }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const inviteUrl = `${siteUrl}/sign-up?invite=${invite.token}`

    const { error: emailErr } = await resend.emails.send({
      from: 'PSHQ Team <noreply@productslicehq.com>',
      to: email,
      subject: "You've been invited to join the PSHQ admin team",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
          <h2 style="color:#111827;margin:0 0 12px">You're invited to PSHQ Admin</h2>
          <p style="color:#374151;line-height:1.6;margin:0 0 24px">
            You've been added to the <strong>${teamRole}</strong> team.
            Click the link below to create your account:
          </p>
          <a href="${inviteUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
            Accept Invitation
          </a>
          <p style="color:#9ca3af;font-size:0.8125rem;margin:24px 0 0">
            This link expires in 7 days. If you didn't expect this invite, ignore this email.
          </p>
        </div>
      `,
    })

    if (emailErr) return { error: 'Invite created but email failed to send. Share the link manually.' }

    await logAdminAction({ admin_id: adminId, action_type: 'admin_invite', target_table: 'users', metadata: { email, team_role: teamRole } })

    revalidatePath('/admin/team')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

// ── Update team role ──────────────────────────────────────────────────────────

export async function updateTeamRoleAction(userId: string, teamRole: TeamRole): Promise<{ error?: string }> {
  try {
    const { supabase, adminId } = await requireSuperAdmin()
    const service = await createServiceClient()

    await service.from('users').update({ team_role: teamRole }).eq('id', userId)
    await logAdminAction({ admin_id: adminId, action_type: 'admin_team_role_change', target_table: 'users', target_id: userId, metadata: { team_role: teamRole } })

    revalidatePath('/admin/team')
    return {}
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

// ── Remove admin access (downgrade to user) ───────────────────────────────────

export async function removeAdminAccessAction(userId: string): Promise<{ error?: string }> {
  try {
    const { adminId } = await requireSuperAdmin()

    // Prevent self-demotion
    if (userId === adminId) return { error: 'You cannot remove your own admin access.' }

    const service = await createServiceClient()
    await service.from('users').update({ role: 'user', team_role: null }).eq('id', userId)
    await logAdminAction({ admin_id: adminId, action_type: 'admin_access_removed', target_table: 'users', target_id: userId })

    revalidatePath('/admin/team')
    return {}
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}
