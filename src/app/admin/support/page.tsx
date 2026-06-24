import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { UserRow } from '@/types/database'
import { SupportClient } from './client'

const STATUS_COLORS: Record<string, string> = {
  open: '#1d4ed8', in_progress: '#c2410c', resolved: '#15803d', closed: '#6b7280',
}

interface PageProps {
  searchParams: Promise<{ status?: string; type?: string }>
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (p as Pick<UserRow, 'role'> | null)?.role
  if (role !== 'admin' && role !== 'super_admin') redirect('/dashboard')
}

export default async function AdminSupportPage({ searchParams }: PageProps) {
  const { status, type } = await searchParams
  await requireAdmin()
  const service = createServiceClient()

  let query = service
    .from('support_tickets')
    .select(`
      id, ticket_number, subject, status, priority, created_at, updated_at, email,
      user:user_id(full_name, email)
    `)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)
  // type filter: 'member' = has user_id, 'contact' = no user_id
  if (type === 'member')  query = query.not('user_id', 'is', null)
  if (type === 'contact') query = query.is('user_id', null)

  const { data: tickets } = await query
  const rows = ((tickets ?? []) as unknown[]) as Array<{
    id: string; ticket_number: number; subject: string; status: string; priority: string;
    created_at: string; updated_at: string; email: string | null;
    user: { full_name: string | null; email: string } | null
  }>

  return (
    <SupportClient
      rows={rows}
      currentStatus={status}
      currentType={type}
      statusColors={STATUS_COLORS}
    />
  )
}
