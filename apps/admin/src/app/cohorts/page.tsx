import { webUrl } from '@/lib/web-url'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { getCohortMembers, getCohortMetrics, type Cohort } from '@pshq/api-client/cohorts'
import type { UserRow } from '@pshq/database'
import { CohortsClient } from './client'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'super_admin'].includes((p as UserRow).role)) redirect(`${webUrl()}/dashboard`)
}

const COHORTS: Cohort[] = ['zero', 'a', 'b', 'c']

// Epic J §J.1-J.4 — one admin surface for assigning/viewing all four
// cohorts, reusing the one cohort-scoped analytics view rather than four
// separate pages.
export default async function CohortsPage() {
  await requireAdmin()
  const service = createServiceClient()

  const [members, metrics, invitesRes] = await Promise.all([
    Promise.all(COHORTS.map(c => getCohortMembers(service, c))),
    Promise.all(COHORTS.map(c => getCohortMetrics(service, c))),
    service.from('cohort_invites').select('email, cohort, invited_at, consumed_at').is('consumed_at', null).order('invited_at', { ascending: false }),
  ])

  const membersByCohort = Object.fromEntries(COHORTS.map((c, i) => [c, members[i]]))
  const metricsByCohort = Object.fromEntries(COHORTS.map((c, i) => [c, metrics[i]]))
  const pendingInvites = (invitesRes.data ?? []) as Array<{ email: string; cohort: Cohort; invited_at: string }>

  return <CohortsClient membersByCohort={membersByCohort} metricsByCohort={metricsByCohort} pendingInvites={pendingInvites} />
}
