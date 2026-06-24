'use client'

import { useState, useTransition } from 'react'
import { updateUserRoleAction } from './actions'

type UserRole = 'user' | 'admin' | 'super_admin'

interface User {
  id: string; full_name: string | null; first_name: string | null; last_name: string | null;
  email: string; role: string; job_role: string | null; country: string | null;
  areas_of_interest: string[]; bio: string | null; onboarding_done: boolean;
  created_at: string; updated_at: string;
}

interface Props {
  users: User[]
  count: number
  totalPages: number
  page: number
  roleFilter: string
  query: string
  stats: { total: number; newThisMonth: number; admins: number }
}

const ROLES_LIST: UserRole[] = ['user', 'admin', 'super_admin']

const ROLE_STYLE: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: '#FACC15', text: '#0E2A47' },
  admin:       { bg: '#dbeafe', text: '#1d4ed8' },
  user:        { bg: '#f0fdf4', text: '#166534' },
}
const ROLE_LABELS: Record<string, string> = { user: 'Member', admin: 'Admin', super_admin: 'Super Admin' }

function timeAgo(iso: string | null) {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function RoleSelector({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [role, setRole] = useState(currentRole)
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleChange(newRole: string) {
    if (newRole === role) { setEditing(false); return }
    startTransition(async () => {
      await updateUserRoleAction(userId, newRole)
      setRole(newRole)
      setEditing(false)
    })
  }

  const s = ROLE_STYLE[role] ?? { bg: '#f3f4f6', text: '#374151' }

  if (editing) {
    return (
      <select
        autoFocus
        value={role}
        disabled={isPending}
        onChange={e => handleChange(e.target.value)}
        onBlur={() => setEditing(false)}
        style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', border: '1px solid #d1d5db' }}
      >
        {ROLES_LIST.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
      </select>
    )
  }

  return (
    <span
      title="Click to change role"
      onClick={() => setEditing(true)}
      style={{ ...badge, background: s.bg, color: s.text, cursor: 'pointer' }}
    >
      {isPending ? '…' : (ROLE_LABELS[role] ?? role)}
    </span>
  )
}

function UserDrawer({ user, onClose }: { user: User; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.35)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '400px', maxWidth: '95vw', height: '100%', background: '#fff',
          overflowY: 'auto', boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          padding: '1.75rem',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', float: 'right', color: '#9ca3af' }}>✕</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'color-mix(in srgb, var(--color-ink-deep) 10%, white)',
            color: 'var(--color-ink-deep)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1rem', fontWeight: 800, flexShrink: 0,
          }}>
            {(user.full_name ?? user.email).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 0.125rem', color: '#111827' }}>{user.full_name ?? '—'}</p>
            <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0 }}>{user.email}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <DrawerField label="Role">
            <RoleSelector userId={user.id} currentRole={user.role} />
          </DrawerField>
          <DrawerField label="Job role"><span style={valueStyle}>{user.job_role ?? '—'}</span></DrawerField>
          <DrawerField label="Country"><span style={valueStyle}>{user.country ?? '—'}</span></DrawerField>
          <DrawerField label="Onboarding">
            <span style={{ ...badge, background: user.onboarding_done ? '#dcfce7' : '#fef9c3', color: user.onboarding_done ? '#15803d' : '#a16207' }}>
              {user.onboarding_done ? 'Complete' : 'Pending'}
            </span>
          </DrawerField>
          {user.areas_of_interest?.length > 0 && (
            <DrawerField label="Interests">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {user.areas_of_interest.map(i => (
                  <span key={i} style={{ ...badge, background: '#f3f4f6', color: '#374151' }}>{i}</span>
                ))}
              </div>
            </DrawerField>
          )}
          {user.bio && <DrawerField label="Bio"><span style={{ ...valueStyle, lineHeight: 1.6 }}>{user.bio}</span></DrawerField>}
          <DrawerField label="Joined"><span style={valueStyle}>{new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></DrawerField>
          <DrawerField label="Last updated"><span style={valueStyle}>{timeAgo(user.updated_at)}</span></DrawerField>
          <DrawerField label="User ID"><span style={{ ...valueStyle, fontFamily: 'monospace', fontSize: '0.6875rem', wordBreak: 'break-all' }}>{user.id}</span></DrawerField>
        </div>
      </div>
    </div>
  )
}

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 0.25rem' }}>{label}</p>
      {children}
    </div>
  )
}

const ROLE_DISPLAY_LABELS: Record<string, string> = { all: 'All', user: 'Members', admin: 'Admins', super_admin: 'Super Admins' }

export function UsersClient({ users, count, totalPages, page, roleFilter, query, stats }: Props) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  return (
    <div>
      {selectedUser && <UserDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />}

      {/* Header */}
      <header style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-accent-warm)', marginBottom: '0.375rem' }}>
            Tactical Operations Center
          </p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-ink-deep)', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>
            Members
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--color-text-muted)', margin: 0 }}>
            {count.toLocaleString()} {roleFilter === 'all' ? 'total' : ROLE_DISPLAY_LABELS[roleFilter] ?? roleFilter} members
          </p>
        </div>
      </header>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Members', value: stats.total.toLocaleString(), accent: '#0E2A47' },
          { label: 'New (30 days)', value: stats.newThisMonth.toLocaleString(), accent: '#10b981' },
          { label: 'Admins', value: stats.admins.toLocaleString(), accent: '#f59e0b' },
        ].map(k => (
          <div key={k.label} style={{ background: '#ffffff', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)', borderTop: `3px solid ${k.accent}`, borderRadius: '0.625rem', padding: '1rem 1.25rem' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.625rem', fontWeight: 800, color: 'var(--color-ink-deep)', margin: '0 0 0.125rem', lineHeight: 1 }}>{k.value}</p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#ffffff', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)', borderRadius: '0.75rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 6%, transparent)', flexWrap: 'wrap' }}>
          <form method="get" style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
            {roleFilter !== 'all' && <input type="hidden" name="role" value={roleFilter} />}
            <input
              name="q" defaultValue={query} placeholder="Search by name or email…"
              style={{ padding: '0.375rem 0.75rem', border: '1px solid color-mix(in srgb, var(--color-tertiary) 15%, transparent)', borderRadius: '0.375rem', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--color-ink-deep)', outline: 'none', minWidth: '220px', flex: 1 }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}>Search</button>
          </form>

          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            {(['all', 'user', 'admin', 'super_admin'] as const).map(r => (
              <a key={r} href={`?role=${r}${query ? `&q=${encodeURIComponent(query)}` : ''}`} style={{
                padding: '0.3rem 0.75rem', borderRadius: '9999px', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600,
                textDecoration: 'none', textTransform: 'capitalize',
                background: roleFilter === r ? 'var(--color-ink-deep)' : 'transparent',
                color: roleFilter === r ? '#ffffff' : 'var(--color-text-muted)',
                border: `1px solid ${roleFilter === r ? 'transparent' : 'color-mix(in srgb, var(--color-tertiary) 15%, transparent)'}`,
                transition: 'all 150ms',
              }}>
                {ROLE_DISPLAY_LABELS[r]}
              </a>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                {['Member', 'Role', 'Job Role', 'Country', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.625rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)', background: 'var(--color-paper-base)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No members found{query ? ` matching "${query}"` : ''}.
                  </td>
                </tr>
              ) : users.map((u, i) => {
                const initials = (u.full_name ?? u.email).split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                const roleStyle = ROLE_STYLE[u.role] ?? { bg: '#f3f4f6', text: '#374151' }
                return (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)' : 'none' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'color-mix(in srgb, var(--color-ink-deep) 10%, var(--color-paper-base))', color: 'var(--color-ink-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 800, flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 600, color: 'var(--color-ink-deep)', margin: '0 0 0.125rem', whiteSpace: 'nowrap' }}>{u.full_name ?? '—'}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, whiteSpace: 'nowrap' }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <RoleSelector userId={u.id} currentRole={u.role} />
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{u.job_role ?? '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{u.country ?? '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{timeAgo(u.created_at)}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button
                        onClick={() => setSelectedUser(u)}
                        style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-primary-container)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', borderTop: '1px solid color-mix(in srgb, var(--color-tertiary) 6%, transparent)' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              Page {page} of {totalPages} · {count.toLocaleString()} members
            </span>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {page > 1 && (
                <a href={`?page=${page - 1}${roleFilter !== 'all' ? `&role=${roleFilter}` : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}`} style={{ padding: '0.375rem 0.75rem', border: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)', borderRadius: '0.375rem', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--color-ink-deep)', textDecoration: 'none', fontWeight: 500 }}>← Prev</a>
              )}
              {page < totalPages && (
                <a href={`?page=${page + 1}${roleFilter !== 'all' ? `&role=${roleFilter}` : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}`} style={{ padding: '0.375rem 0.75rem', background: 'var(--color-ink-deep)', color: '#ffffff', borderRadius: '0.375rem', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', textDecoration: 'none', fontWeight: 500 }}>Next →</a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const badge: React.CSSProperties = { display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '0.2rem', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }
const valueStyle: React.CSSProperties = { fontSize: '0.875rem', color: '#374151', display: 'block' }
