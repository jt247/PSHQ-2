import { createServiceClient } from '@/lib/supabase/server'
import { UsersClient } from './client'

const ROLES = ['all', 'user', 'admin', 'super_admin'] as const

interface PageProps {
  searchParams: Promise<{ role?: string; page?: string; q?: string }>
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const roleFilter = (params.role ?? 'all') as typeof ROLES[number]
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const query = params.q ?? ''
  const PAGE_SIZE = 25
  const offset = (page - 1) * PAGE_SIZE

  const service = createServiceClient()

  let q = service
    .from('users')
    .select('id, full_name, first_name, last_name, email, role, job_role, country, areas_of_interest, bio, onboarding_done, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (roleFilter !== 'all') q = q.eq('role', roleFilter)
  if (query) q = q.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)

  const { data: users, count } = await q

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const [totalRes, newRes, adminRes] = await Promise.all([
    service.from('users').select('id', { count: 'exact', head: true }),
    service.from('users').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    service.from('users').select('id', { count: 'exact', head: true })
      .in('role', ['admin', 'super_admin']),
  ])

  return (
    <UsersClient
      users={(users ?? []) as Array<{
        id: string; full_name: string | null; first_name: string | null; last_name: string | null;
        email: string; role: string; job_role: string | null; country: string | null;
        areas_of_interest: string[]; bio: string | null; onboarding_done: boolean;
        created_at: string; updated_at: string;
      }>}
      count={count ?? 0}
      totalPages={totalPages}
      page={page}
      roleFilter={roleFilter}
      query={query}
      stats={{
        total: totalRes.count ?? 0,
        newThisMonth: newRes.count ?? 0,
        admins: adminRes.count ?? 0,
      }}
    />
  )
}
