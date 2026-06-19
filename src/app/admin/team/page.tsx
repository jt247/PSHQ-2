import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { UserRow } from '@/types/database'
import { TeamClient } from './client'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const profile = p as Pick<UserRow, 'role'> | null
  if (profile?.role !== 'super_admin') {
    return { forbidden: true as const, userId: user.id }
  }
  return { forbidden: false as const, userId: user.id }
}

export default async function TeamPage() {
  const { forbidden, userId } = await requireSuperAdmin()

  if (forbidden) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1.5rem', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>403 — Access Denied</h1>
        <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Team Management is only available to super admins.</p>
      </div>
    )
  }

  const service = createServiceClient()

  // Fetch all admins and super_admins
  const { data: admins } = await service
    .from('users')
    .select('id, email, full_name, team_role, updated_at')
    .in('role', ['admin', 'super_admin'])
    .order('created_at', { ascending: true })

  const adminList = (admins ?? []) as Array<Pick<UserRow, 'id' | 'email' | 'full_name' | 'team_role' | 'updated_at'>>
  const adminIds = adminList.map(a => a.id)

  // Fetch action counts and last action time per admin
  const actionStats = new Map<string, { count: number; last: string | null }>()

  if (adminIds.length > 0) {
    const { data: logs } = await service
      .from('admin_actions_log')
      .select('admin_id, created_at')
      .in('admin_id', adminIds)
      .order('created_at', { ascending: false })

    for (const row of (logs ?? []) as Array<{ admin_id: string; created_at: string }>) {
      const existing = actionStats.get(row.admin_id)
      actionStats.set(row.admin_id, {
        count: (existing?.count ?? 0) + 1,
        last: existing?.last ?? row.created_at, // first occurrence = most recent (desc order)
      })
    }
  }

  const members = adminList.map(a => ({
    id: a.id,
    email: a.email,
    full_name: a.full_name,
    team_role: a.team_role,
    last_active: actionStats.get(a.id)?.last ?? null,
    action_count: actionStats.get(a.id)?.count ?? 0,
  }))

  return <TeamClient members={members} currentUserId={userId} />
}
