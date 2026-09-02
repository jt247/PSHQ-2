import { webUrl } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import type { UserRow } from '@pshq/database'
import { SupportClient, type UnifiedRow } from './client'

interface PageProps {
  searchParams: Promise<{ status?: string; source?: string; category?: string }>
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (p as Pick<UserRow, 'role'> | null)?.role
  if (role !== 'admin' && role !== 'super_admin') redirect(`${webUrl()}/dashboard`)
}

// Epic G §G.10-14 — unified Support and Feedback Center. Merges 3 native
// tables (support_tickets, content_requests, feedback) at the read layer
// only, per standing rule 1 — none of them get re-migrated into a shared
// schema. Each source keeps writing its own native status enum; this page
// only ever displays/accepts the normalized 6-value vocabulary.
const TICKET_TO_DISPLAY: Record<string, string> = { open: 'new', in_progress: 'in_progress', resolved: 'resolved', closed: 'closed' }
const REQUEST_TO_DISPLAY: Record<string, string> = { open: 'new', in_review: 'reviewing', planned: 'planned', completed: 'resolved', declined: 'closed' }

export default async function AdminSupportPage({ searchParams }: PageProps) {
  const { status, source, category } = await searchParams
  await requireAdmin()
  const service = createServiceClient()

  const [ticketsRes, requestsRes, feedbackRes] = await Promise.all([
    service.from('support_tickets').select('id, subject, status, priority, created_at, updated_at, email, user:user_id(full_name, email)').order('updated_at', { ascending: false }).limit(200),
    service.from('content_requests').select('id, title, description, status, created_at, updated_at, user:user_id(full_name, email)').order('updated_at', { ascending: false }).limit(200),
    service.from('feedback').select('id, category, message, status, created_at, updated_at, user:user_id(full_name, email)').order('updated_at', { ascending: false }).limit(200),
  ])

  const tickets: UnifiedRow[] = ((ticketsRes.data ?? []) as unknown as Array<{ id: string; subject: string; status: string; priority: string; created_at: string; updated_at: string; email: string | null; user: { full_name: string | null; email: string } | null }>)
    .map(t => ({
      id: t.id, source: 'support' as const, title: t.subject, category: null,
      status: TICKET_TO_DISPLAY[t.status] ?? 'new',
      contactName: t.user?.full_name ?? t.email ?? 'Anonymous', contactEmail: t.user?.email ?? t.email ?? null,
      created_at: t.created_at, updated_at: t.updated_at, detailHref: `/support/${t.id}`,
    }))

  const requests: UnifiedRow[] = ((requestsRes.data ?? []) as unknown as Array<{ id: string; title: string; description: string | null; status: string; created_at: string; updated_at: string; user: { full_name: string | null; email: string } | null }>)
    .map(r => ({
      id: r.id, source: 'content_request' as const, title: r.title, category: 'content_request',
      status: REQUEST_TO_DISPLAY[r.status] ?? 'new',
      contactName: r.user?.full_name ?? '—', contactEmail: r.user?.email ?? null,
      created_at: r.created_at, updated_at: r.updated_at, detailHref: null,
    }))

  const feedback: UnifiedRow[] = ((feedbackRes.data ?? []) as unknown as Array<{ id: string; category: string; message: string; status: string; created_at: string; updated_at: string; user: { full_name: string | null; email: string } | null }>)
    .map(f => ({
      id: f.id, source: 'feedback' as const, title: f.message.slice(0, 80), category: f.category,
      status: f.status,
      contactName: f.user?.full_name ?? 'Anonymous', contactEmail: f.user?.email ?? null,
      created_at: f.created_at, updated_at: f.updated_at, detailHref: null,
    }))

  let rows = [...tickets, ...requests, ...feedback].sort((a, b) => b.updated_at.localeCompare(a.updated_at))

  if (status) rows = rows.filter(r => r.status === status)
  if (source) rows = rows.filter(r => r.source === source)
  if (category) rows = rows.filter(r => r.category === category)

  const openCount = [...tickets, ...requests, ...feedback].filter(r => !['resolved', 'closed'].includes(r.status)).length

  return <SupportClient rows={rows} currentStatus={status} currentSource={source} currentCategory={category} openCount={openCount} />
}
