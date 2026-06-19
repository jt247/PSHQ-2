import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TicketDetailClient, type Ticket } from './client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TicketDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select(`
      id, ticket_number, subject, description, status, priority, created_at, user_id,
      ticket_replies(
        id, body, image_url, is_internal, created_at,
        user:users(full_name, email, role)
      )
    `)
    .eq('id', id)
    .single()

  if (!ticket) notFound()

  // Only owner can view their ticket (admin sees via admin panel)
  const isOwner = (ticket as { user_id: string | null }).user_id === user.id
  if (!isOwner) {
    // Allow if user is admin
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    const role = (profile as { role: string } | null)?.role
    if (role !== 'admin' && role !== 'super_admin') redirect('/dashboard/support')
  }

  // Filter out internal replies for non-admin users
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role: string } | null)?.role
  const isAdmin = role === 'admin' || role === 'super_admin'

  const raw = ticket as Record<string, unknown>
  const replies = ((raw.ticket_replies as unknown[]) ?? []).filter((r: unknown) => {
    if (isAdmin) return true
    return !(r as { is_internal: boolean }).is_internal
  })

  const normalized = { ...raw, replies } as Parameters<typeof TicketDetailClient>[0]['ticket']

  return <TicketDetailClient ticket={normalized} isOwner={isOwner} />
}
