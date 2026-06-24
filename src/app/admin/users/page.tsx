import { createServiceClient } from '@/lib/supabase/server'

const ROLES = ['all', 'member', 'admin', 'super_admin'] as const

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
    .select('id, full_name, email, role, job_role, country, created_at, last_sign_in_at', { count: 'exact' })
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

  function timeAgo(iso: string | null) {
    if (!iso) return '—'
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const ROLE_STYLE: Record<string, { bg: string; text: string }> = {
    super_admin: { bg: '#FACC15', text: '#0E2A47' },
    admin:       { bg: '#dbeafe', text: '#1d4ed8' },
    member:      { bg: '#f0fdf4', text: '#166534' },
  }

  return (
    <div>
      {/* Header */}
      <header style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--color-accent-warm)', marginBottom: '0.375rem',
          }}>
            Tactical Operations Center
          </p>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: '1.75rem',
            fontWeight: 700, color: 'var(--color-ink-deep)', margin: '0 0 0.25rem',
            letterSpacing: '-0.02em',
          }}>
            Members
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--color-text-muted)', margin: 0 }}>
            {(count ?? 0).toLocaleString()} {roleFilter === 'all' ? 'total' : roleFilter} members
          </p>
        </div>
      </header>

      {/* KPI strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem', marginBottom: '1.5rem',
      }}>
        {[
          { label: 'Total Members', value: (totalRes.count ?? 0).toLocaleString(), accent: '#0E2A47' },
          { label: 'New (30 days)', value: (newRes.count ?? 0).toLocaleString(), accent: '#10b981' },
          { label: 'Admins', value: (adminRes.count ?? 0).toLocaleString(), accent: '#f59e0b' },
        ].map(k => (
          <div key={k.label} style={{
            background: '#ffffff',
            border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
            borderTop: `3px solid ${k.accent}`,
            borderRadius: '0.625rem',
            padding: '1rem 1.25rem',
          }}>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: '1.625rem',
              fontWeight: 800, color: 'var(--color-ink-deep)', margin: '0 0 0.125rem', lineHeight: 1,
            }}>
              {k.value}
            </p>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--color-text-muted)', margin: 0,
            }}>
              {k.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: '#ffffff',
        border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
        borderRadius: '0.75rem', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.875rem 1.25rem',
          borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 6%, transparent)',
          flexWrap: 'wrap',
        }}>
          {/* Search */}
          <form method="get" style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
            {roleFilter !== 'all' && <input type="hidden" name="role" value={roleFilter} />}
            <input
              name="q"
              defaultValue={query}
              placeholder="Search by name or email…"
              style={{
                padding: '0.375rem 0.75rem',
                border: '1px solid color-mix(in srgb, var(--color-tertiary) 15%, transparent)',
                borderRadius: '0.375rem',
                fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                color: 'var(--color-ink-deep)',
                outline: 'none', minWidth: '220px', flex: 1,
              }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}>
              Search
            </button>
          </form>

          {/* Role tabs */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {ROLES.map(r => (
              <a key={r} href={`?role=${r}${query ? `&q=${encodeURIComponent(query)}` : ''}`} style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '9999px',
                fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600,
                textDecoration: 'none',
                textTransform: 'capitalize',
                background: roleFilter === r ? 'var(--color-ink-deep)' : 'transparent',
                color: roleFilter === r ? '#ffffff' : 'var(--color-text-muted)',
                border: `1px solid ${roleFilter === r ? 'transparent' : 'color-mix(in srgb, var(--color-tertiary) 15%, transparent)'}`,
                transition: 'all 150ms',
              }}>
                {r === 'all' ? 'All' : r === 'super_admin' ? 'Super Admin' : r.charAt(0).toUpperCase() + r.slice(1)}
              </a>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
          }}>
            <thead>
              <tr>
                {['Member', 'Role', 'Job Role', 'Country', 'Joined', 'Last Active'].map(h => (
                  <th key={h} style={{
                    padding: '0.625rem 1rem', textAlign: 'left',
                    fontSize: '0.625rem', fontWeight: 700, color: 'var(--color-text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
                    background: 'var(--color-paper-base)',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!users || users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{
                    padding: '3rem', textAlign: 'center',
                    color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)',
                  }}>
                    No members found{query ? ` matching "${query}"` : ''}.
                  </td>
                </tr>
              ) : users.map((u, i) => {
                const initials = (u.full_name ?? u.email).split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                const roleStyle = ROLE_STYLE[u.role] ?? { bg: '#f3f4f6', text: '#374151' }
                return (
                  <tr key={u.id} style={{
                    borderBottom: i < users.length - 1
                      ? '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)'
                      : 'none',
                  }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: 'color-mix(in srgb, var(--color-ink-deep) 10%, var(--color-paper-base))',
                          color: 'var(--color-ink-deep)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.625rem', fontWeight: 800, flexShrink: 0,
                        }}>
                          {initials}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 600, color: 'var(--color-ink-deep)', margin: '0 0 0.125rem', whiteSpace: 'nowrap' }}>
                            {u.full_name ?? '—'}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, whiteSpace: 'nowrap' }}>
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        display: 'inline-flex', padding: '0.15rem 0.5rem',
                        background: roleStyle.bg, color: roleStyle.text,
                        borderRadius: '0.2rem', fontSize: '0.625rem',
                        fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}>
                        {u.role === 'super_admin' ? 'Super Admin' : u.role ?? 'member'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {(u as { job_role?: string }).job_role ?? '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {(u as { country?: string }).country ?? '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                      {timeAgo(u.created_at)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                      {timeAgo((u as { last_sign_in_at?: string | null }).last_sign_in_at ?? null)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.875rem 1.25rem',
            borderTop: '1px solid color-mix(in srgb, var(--color-tertiary) 6%, transparent)',
          }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              Page {page} of {totalPages} · {(count ?? 0).toLocaleString()} members
            </span>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {page > 1 && (
                <a href={`?page=${page - 1}${roleFilter !== 'all' ? `&role=${roleFilter}` : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)',
                    borderRadius: '0.375rem',
                    fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
                    color: 'var(--color-ink-deep)', textDecoration: 'none', fontWeight: 500,
                  }}>
                  ← Prev
                </a>
              )}
              {page < totalPages && (
                <a href={`?page=${page + 1}${roleFilter !== 'all' ? `&role=${roleFilter}` : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: 'var(--color-ink-deep)', color: '#ffffff',
                    borderRadius: '0.375rem',
                    fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
                    textDecoration: 'none', fontWeight: 500,
                  }}>
                  Next →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
