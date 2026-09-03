'use client'

import { useState, useTransition } from 'react'
import { assignExistingUserToCohortAction, removeCohortAction, bulkInviteToCohortAction } from './actions'
import type { Cohort, CohortMember, CohortMetrics } from '@pshq/api-client/cohorts'

const COHORT_LABELS: Record<Cohort, string> = {
  zero: 'Cohort Zero — workshop database (~200)',
  a: 'Cohort A — functional QA (~30)',
  b: 'Cohort B — learning & engagement (~70)',
  c: 'Cohort C — launch simulation (~100)',
}

interface Props {
  membersByCohort: Record<string, CohortMember[]>
  metricsByCohort: Record<string, CohortMetrics>
  pendingInvites: Array<{ email: string; cohort: Cohort; invited_at: string }>
}

export function CohortsClient({ membersByCohort, metricsByCohort, pendingInvites }: Props) {
  const [active, setActive] = useState<Cohort>('zero')

  return (
    <div className="admin-main-inner" style={{ maxWidth: '900px' }}>
      <h1 style={{ margin: '0 0 0.375rem', fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-ink-deep)' }}>
        Cohorts
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', margin: '0 0 1.5rem' }}>
        Tag real members into a rollout cohort and see cohort-scoped metrics. Nothing here fabricates users — assignment only works on real accounts or real emails you provide.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(Object.keys(COHORT_LABELS) as Cohort[]).map(c => (
          <button
            key={c}
            onClick={() => setActive(c)}
            style={{
              padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid #d1d5db', fontSize: '0.8125rem', cursor: 'pointer',
              background: active === c ? 'var(--color-ink-deep)' : '#fff', color: active === c ? '#fff' : '#374151',
            }}
          >
            {COHORT_LABELS[c]} · {membersByCohort[c]?.length ?? 0}
          </button>
        ))}
      </div>

      <CohortPanel
        cohort={active}
        members={membersByCohort[active] ?? []}
        metrics={metricsByCohort[active]}
        pendingInvites={pendingInvites.filter(i => i.cohort === active)}
      />
    </div>
  )
}

function CohortPanel({ cohort, members, metrics, pendingInvites }: { cohort: Cohort; members: CohortMember[]; metrics: CohortMetrics; pendingInvites: Array<{ email: string; invited_at: string }> }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [singleEmail, setSingleEmail] = useState('')
  const [bulkEmails, setBulkEmails] = useState('')
  const [bulkResult, setBulkResult] = useState<string | null>(null)

  function run(fn: () => Promise<{ error?: string; count?: number }>, onSuccess?: (count?: number) => void) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.error) setError(res.error)
      else onSuccess?.(res.count)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && <div style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', padding: '0.75rem 1rem', color: '#b91c1c', fontSize: '0.875rem' }}>{error}</div>}

      <Card title="Cohort-scoped metrics" hint="Real query results, filtered to this cohort's members only">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
          <Stat label="Members" value={metrics.totalMembers} />
          <Stat label="Onboarding rate" value={`${metrics.onboardingCompletionRate}%`} />
          <Stat label="Activated" value={metrics.activatedUsers} />
          <Stat label="Day 7 retention" value={`${metrics.day7Retention}%`} />
          <Stat label="Feedback" value={metrics.feedbackCount} />
          <Stat label="Learning path starts" value={metrics.learningPathStarts} />
          <Stat label="Learning path completions" value={metrics.learningPathCompletions} />
          <Stat label="Leaderboard ranked" value={metrics.leaderboardRanked} />
          <Stat label="AI feature users" value={metrics.aiFeatureUsers} />
          <Stat label="Resource openers" value={metrics.resourceOpeners} />
          <Stat label="Dashboard viewers" value={metrics.dashboardViewers} />
          <Stat label="Mobile users" value={metrics.mobileUsers} />
          <Stat label="Web users" value={metrics.webUsers} />
          <Stat label="Searches run" value={metrics.contentDiscoveryEvents} />
          <Stat label="Zero-result searches" value={metrics.searchZeroResultCount} />
          <Stat label="Recommendation clicks" value={metrics.recommendationClicks} />
          <Stat label="Emails delivered" value={metrics.emailDeliveredCount} />
          <Stat label="Push notifications sent" value={metrics.pushDeliveredCount} />
          <Stat label="Community contributions" value={metrics.communityContributionCount} />
        </div>
      </Card>

      <Card title="Assign an existing member">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            value={singleEmail} onChange={e => setSingleEmail(e.target.value)}
            placeholder="member@email.com" style={inputStyle}
          />
          <button
            onClick={() => run(() => assignExistingUserToCohortAction(singleEmail, cohort), () => setSingleEmail(''))}
            disabled={pending || !singleEmail}
            style={buttonStyle}
          >
            Assign to {cohort}
          </button>
        </div>
      </Card>

      <Card title="Invite by email (bulk)" hint="Paste real emails from your workshop database — one per line, or comma-separated. Existing members are tagged immediately; new emails are queued and auto-assigned the moment they sign up.">
        <textarea
          value={bulkEmails} onChange={e => setBulkEmails(e.target.value)}
          rows={5} placeholder={'jane@example.com\njohn@example.com'}
          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
        />
        <button
          onClick={() => run(() => bulkInviteToCohortAction(bulkEmails, cohort), (count) => { setBulkEmails(''); setBulkResult(`Tagged/queued ${count} email(s) for ${cohort}.`) })}
          disabled={pending || !bulkEmails.trim()}
          style={{ ...buttonStyle, marginTop: '0.5rem' }}
        >
          Queue for {cohort}
        </button>
        {bulkResult && <p style={{ fontSize: '0.8125rem', color: '#15803d', marginTop: '0.5rem' }}>{bulkResult}</p>}

        {pendingInvites.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Pending invites (not yet signed up)</p>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
              {pendingInvites.map(i => <div key={i.email}>{i.email}</div>)}
            </div>
          </div>
        )}
      </Card>

      <Card title={`Members (${members.length})`}>
        {members.length === 0 ? (
          <p style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>No members assigned to this cohort yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {members.map(m => (
              <div key={m.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.375rem' }}>
                <span>{m.fullName ?? m.email} <span style={{ color: '#9ca3af' }}>({m.email})</span></span>
                <button
                  onClick={() => run(() => removeCohortAction(m.userId, cohort))}
                  disabled={pending}
                  style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
      <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 0.25rem' }}>{title}</h2>
      {hint && <p style={{ fontSize: '0.8125rem', color: '#9ca3af', margin: '0 0 0.75rem' }}>{hint}</p>}
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: '1px solid #f3f4f6', borderRadius: '8px', padding: '0.625rem 0.75rem' }}>
      <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>{value}</div>
      <div style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>{label}</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }
const buttonStyle: React.CSSProperties = { padding: '0.5rem 1rem', background: 'var(--color-ink-deep)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }
