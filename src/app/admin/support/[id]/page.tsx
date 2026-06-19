import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRow } from '@/types/database'
import { AdminTicketClient } from './client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminTicketPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (p as Pick<UserRow, 'role'> | null)?.role
  if (role !== 'admin' && role !== 'super_admin') redirect('/dashboard')

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select(`
      id, ticket_number, subject, description, status, priority, created_at, email, assigned_to,
      user:user_id(full_name, email),
      ticket_replies(id, body, image_url, is_internal, created_at, user:user_id(full_name, email, role))
    `)
    .eq('id', id)
    .single()

  if (!ticket) notFound()

  const { data: agents } = await supabase
    .from('users')
    .select('id, full_name, email')
    .in('role', ['admin', 'super_admin'])
    .limit(20)

  const ticketData = ticket as Record<string, unknown>
  const agentList = (agents ?? []) as Array<{ id: string; full_name: string | null; email: string }>

  return <AdminTicketClient ticket={ticketData} agents={agentList} />
}
