'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@pshq/api-client/server'

export interface CommunityActionState {
  error?: string
  success?: string
}

const GRANTABLE_ACTIONS = ['case_accepted', 'product_lab_attendance', 'community_contribution_approved'] as const

// Epic F §F.3's "simple internal route" for the three admin-mediated
// scoring actions (§F.2) that have no self-serve UI yet — real approval
// workflows are Epic G, this is deliberately just a form + an RPC call.
// The RPC (admin_grant_contribution, packages/database migration
// 20260902000031) re-checks is_admin() itself server-side — this action
// checking first is a better error message, not the actual security
// boundary, so there's no path where "no self-generated admin points"
// (§F.3) depends on this page's own logic being correct.
export async function grantContributionAction(_prev: CommunityActionState, formData: FormData): Promise<CommunityActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const email = (formData.get('email') as string ?? '').trim().toLowerCase()
  const action = formData.get('action') as string
  if (!email) return { error: 'Enter a member email.' }
  if (!GRANTABLE_ACTIONS.includes(action as typeof GRANTABLE_ACTIONS[number])) return { error: 'Invalid action.' }

  const service = createServiceClient()
  const { data: target } = await service.from('users').select('id, full_name').eq('email', email).maybeSingle()
  if (!target) return { error: `No member found with email ${email}.` }

  const { error } = await supabase.rpc('admin_grant_contribution', {
    p_target_user_id: target.id, p_action: action, p_ref_id: null,
  })
  if (error) return { error: error.message }

  revalidatePath('/community')
  return { success: `Granted "${action}" to ${target.full_name ?? email}.` }
}

export async function adjustScoreAction(_prev: CommunityActionState, formData: FormData): Promise<CommunityActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const email = (formData.get('email') as string ?? '').trim().toLowerCase()
  const delta = parseInt(formData.get('delta') as string ?? '', 10)
  const note = (formData.get('note') as string ?? '').trim() || null
  if (!email) return { error: 'Enter a member email.' }
  if (!Number.isFinite(delta) || delta === 0) return { error: 'Enter a non-zero point adjustment.' }

  const service = createServiceClient()
  const { data: target } = await service.from('users').select('id, full_name').eq('email', email).maybeSingle()
  if (!target) return { error: `No member found with email ${email}.` }

  const { error } = await supabase.rpc('admin_adjust_score', {
    p_target_user_id: target.id, p_delta: delta, p_note: note,
  })
  if (error) return { error: error.message }

  revalidatePath('/community')
  return { success: `Adjusted ${target.full_name ?? email}'s score by ${delta > 0 ? '+' : ''}${delta}.` }
}
