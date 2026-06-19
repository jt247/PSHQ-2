'use client'

import { useActionState, useTransition } from 'react'
import { inviteAdminAction, updateTeamRoleAction, removeAdminAccessAction, type InviteState } from './actions'
import type { TeamRole } from '@/types/database'

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  team_role: TeamRole | null
  last_active: string | null
  action_count: number
}

interface Props {
  members: TeamMember[]
  currentUserId: string
}

const initial: InviteState = {}

const TEAM_ROLE_LABELS: Record<string, string> = { product: 'Product', support: 'Support', growth: 'Growth' }

export function TeamClient({ members, currentUserId }: Props) {
  const [state, action, pending] = useActionState(inviteAdminAction, initial)

  return (
    <div style={page}>
      <div style={titleRow}>
        <div>
          <h1 style={h1}>Team Management</h1>
          <p style={sub}>Manage admin access. Changes are logged to the audit trail.</p>
        </div>
        <span style={badge}>super_admin only</span>
      </div>

      {/* Current team */}
      <section style={card}>
        <h2 style={sectionTitle}>Admin team ({members.length})</h2>
        {members.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No admins yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                {['Name / Email', 'Team role', 'Last active', 'Actions taken', ''].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <MemberRow key={m.id} member={m} isSelf={m.id === currentUserId} />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Invite form */}
      <section style={card}>
        <h2 style={sectionTitle}>Invite a new admin</h2>
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 1rem' }}>
          An invitation email will be sent with a signup link that pre-assigns admin + team role on account creation.
        </p>
        <form action={action} style={formRow}>
          <input
            name="email"
            type="email"
            placeholder="admin@example.com"
            required
            style={input}
          />
          <select name="team_role" required style={select}>
            <option value="">— Team role —</option>
            <option value="product">Product</option>
            <option value="support">Support</option>
            <option value="growth">Growth</option>
          </select>
          <button type="submit" disabled={pending} style={btnPrimary}>
            {pending ? 'Sending…' : 'Send invite'}
          </button>
        </form>
        {state.error   && <p style={errorText}>{state.error}</p>}
        {state.success && <p style={successText}>Invitation sent successfully.</p>}
      </section>
    </div>
  )
}

function MemberRow({ member, isSelf }: { member: TeamMember; isSelf: boolean }) {
  const [, startTransition] = useTransition()

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as TeamRole
    startTransition(async () => {
      await updateTeamRoleAction(member.id, newRole)
    })
  }

  function handleRemove() {
    if (!confirm(`Remove admin access for ${member.full_name ?? member.email}? They will become a regular user.`)) return
    startTransition(async () => {
      await removeAdminAccessAction(member.id)
    })
  }

  const lastActive = member.last_active
    ? new Date(member.last_active).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never'

  return (
    <tr>
      <td style={td}>
        <div style={{ fontWeight: 500, color: '#111827' }}>{member.full_name ?? '—'}</div>
        <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{member.email}</div>
        {isSelf && <span style={selfBadge}>you</span>}
      </td>
      <td style={td}>
        <select
          defaultValue={member.team_role ?? ''}
          onChange={handleRoleChange}
          disabled={isSelf}
          style={{ ...select, width: 'auto', minWidth: '110px' }}
        >
          <option value="">— unset —</option>
          <option value="product">Product</option>
          <option value="support">Support</option>
          <option value="growth">Growth</option>
        </select>
      </td>
      <td style={td}>{lastActive}</td>
      <td style={td}>{member.action_count.toLocaleString()}</td>
      <td style={td}>
        {!isSelf && (
          <button onClick={handleRemove} style={btnDanger}>Remove access</button>
        )}
      </td>
    </tr>
  )
}

const page: React.CSSProperties = { maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: '1.25rem' }
const titleRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }
const h1: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }
const sub: React.CSSProperties = { color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }
const badge: React.CSSProperties = { padding: '0.2rem 0.6rem', background: '#fef3c7', color: '#b45309', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem 1.5rem' }
const sectionTitle: React.CSSProperties = { fontSize: '0.9375rem', fontWeight: 600, color: '#111827', margin: '0 0 1rem' }
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }
const th: React.CSSProperties = { padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }
const td: React.CSSProperties = { padding: '0.75rem', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }
const formRow: React.CSSProperties = { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }
const input: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', flex: 1, minWidth: '200px' }
const select: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', background: '#fff' }
const btnPrimary: React.CSSProperties = { padding: '0.5rem 1.25rem', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }
const btnDanger: React.CSSProperties = { padding: '0.375rem 0.75rem', background: '#fff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }
const selfBadge: React.CSSProperties = { display: 'inline-block', marginTop: '0.2rem', padding: '0.1rem 0.4rem', background: '#dbeafe', color: '#1d4ed8', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }
const errorText: React.CSSProperties = { color: '#dc2626', fontSize: '0.8125rem', margin: '0.5rem 0 0' }
const successText: React.CSSProperties = { color: '#16a34a', fontSize: '0.8125rem', margin: '0.5rem 0 0' }
