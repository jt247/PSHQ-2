import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const service = createServiceClient()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    usersRes,
    newUsersRes,
    activeUsersRes,
    contentRes,
    interactionsRes,
    recentUsersRes,
    topContentRes,
    contentByTypeRes,
    recentUnlocksRes,
  ] = await Promise.all([
    service.from('users').select('id', { count: 'exact', head: true }),
    service.from('users').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    service.from('users').select('id', { count: 'exact', head: true }).gte('last_sign_in_at', sevenDaysAgo),
    service.from('content').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    service.from('content_interactions').select('id', { count: 'exact', head: true }),
    service.from('users').select('id, full_name, email, role, created_at').order('created_at', { ascending: false }).limit(7),
    service.from('content')
      .select('id, title, slug, type, view_count, upvote_count')
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .limit(6),
    service.from('content')
      .select('type')
      .eq('status', 'published'),
    service.from('content_interactions')
      .select('created_at, type, content:content_id(title, type)')
      .eq('type', 'unlock')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const totalUsers = usersRes.count ?? 0
  const newUsers30d = newUsersRes.count ?? 0
  const activeUsers7d = activeUsersRes.count ?? 0
  const totalContent = contentRes.count ?? 0
  const totalInteractions = interactionsRes.count ?? 0

  const recentUsers = (recentUsersRes.data ?? []) as Array<{
    id: string; full_name: string | null; email: string; role: string; created_at: string;
  }>
  const topContent = (topContentRes.data ?? []) as Array<{
    id: string; title: string; slug: string; type: string; view_count: number | null; upvote_count: number | null;
  }>

  const allContent = (contentByTypeRes.data ?? []) as Array<{ type: string }>
  const byType: Record<string, number> = {}
  for (const c of allContent) {
    byType[c.type] = (byType[c.type] ?? 0) + 1
  }

  const recentUnlocks = (recentUnlocksRes.data ?? []) as Array<{
    created_at: string; type: string;
    content: { title: string; type: string } | null;
  }>

  function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    article:  { bg: '#e0eaff', text: '#3451b2', dot: '#6366f1' },
    ebook:    { bg: '#f3e8ff', text: '#7c3aed', dot: '#7c3aed' },
    template: { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
    course:   { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
    resource: { bg: '#ffe4e6', text: '#9f1239', dot: '#e11d48' },
  }

  const growthPct = totalUsers > 0 ? Math.round((newUsers30d / totalUsers) * 100) : 0

  return (
    <div>
      {/* ── Page header ── */}
      <header style={{ marginBottom: '2rem' }}>
        <p style={{
          fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--color-accent-warm)', marginBottom: '0.375rem',
        }}>
          Tactical Operations Center
        </p>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: '1.875rem',
          fontWeight: 700, color: 'var(--color-ink-deep)', margin: '0 0 0.375rem',
          letterSpacing: '-0.02em',
        }}>
          Platform Overview
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--color-text-muted)', margin: 0 }}>
          Real-time health, acquisition, and engagement across Product Slice HQ.
        </p>
      </header>

      {/* ── KPI row ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '1rem', marginBottom: '1.75rem',
      }}>
        {[
          {
            label: 'Total Members',
            value: totalUsers.toLocaleString(),
            sub: `+${newUsers30d} this month`,
            icon: '👥',
            accent: '#0E2A47',
            highlight: true,
          },
          {
            label: 'New (30 days)',
            value: newUsers30d.toLocaleString(),
            sub: `${growthPct}% of total`,
            icon: '🌱',
            accent: '#10b981',
            highlight: false,
          },
          {
            label: 'Active (7 days)',
            value: activeUsers7d.toLocaleString(),
            sub: 'signed in recently',
            icon: '⚡',
            accent: '#f59e0b',
            highlight: false,
          },
          {
            label: 'Published Content',
            value: totalContent.toLocaleString(),
            sub: `${Object.keys(byType).length} content types`,
            icon: '📄',
            accent: '#6366f1',
            highlight: false,
          },
          {
            label: 'Total Interactions',
            value: totalInteractions.toLocaleString(),
            sub: 'views + unlocks',
            icon: '📈',
            accent: '#e11d48',
            highlight: false,
          },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: kpi.highlight ? 'var(--color-ink-deep)' : '#ffffff',
            border: `1px solid ${kpi.highlight ? 'transparent' : 'color-mix(in srgb, var(--color-tertiary) 8%, transparent)'}`,
            borderRadius: '0.75rem',
            padding: '1.25rem',
            borderTop: `3px solid ${kpi.accent}`,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {kpi.highlight && (
              <div style={{
                position: 'absolute', top: 0, right: 0,
                width: '80px', height: '80px',
                background: 'radial-gradient(circle, rgba(250,204,21,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />
            )}
            <div style={{ fontSize: '1.125rem', marginBottom: '0.625rem' }}>{kpi.icon}</div>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1.875rem', fontWeight: 800, lineHeight: 1,
              color: kpi.highlight ? '#ffffff' : 'var(--color-ink-deep)',
              margin: '0 0 0.25rem',
            }}>
              {kpi.value}
            </p>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: kpi.highlight ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)',
              margin: '0 0 0.375rem',
            }}>
              {kpi.label}
            </p>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
              color: kpi.highlight ? 'var(--color-accent-warm)' : `${kpi.accent}`,
              margin: 0, fontWeight: 500,
            }}>
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── Main grid: Recent Users + Top Content ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '1.25rem', marginBottom: '1.75rem',
      }}>
        {/* Recent signups */}
        <section style={{
          background: '#ffffff',
          border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
          borderRadius: '0.75rem', overflow: 'hidden',
        }}>
          <div style={{
            padding: '1.25rem 1.5rem 1rem',
            borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 6%, transparent)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
              fontWeight: 700, color: 'var(--color-ink-deep)',
              margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              👤 Recent Signups
            </h3>
            <Link href="/admin/users" style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
              color: 'var(--color-text-muted)', textDecoration: 'none', fontWeight: 600,
            }}>
              All users →
            </Link>
          </div>
          <div>
            {recentUsers.length === 0 ? (
              <p style={{ padding: '1.5rem', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                No users yet.
              </p>
            ) : recentUsers.map((u, i) => {
              const initials = (u.full_name ?? u.email).split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
              const isAdmin = u.role === 'admin' || u.role === 'super_admin'
              return (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1.5rem',
                  borderBottom: i < recentUsers.length - 1 ? '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)' : 'none',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: isAdmin ? 'var(--color-ink-deep)' : 'color-mix(in srgb, var(--color-ink-deep) 12%, var(--color-paper-base))',
                    color: isAdmin ? '#ffffff' : 'var(--color-ink-deep)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.625rem', fontWeight: 800, flexShrink: 0,
                    fontFamily: 'var(--font-sans)',
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                      fontWeight: 600, color: 'var(--color-ink-deep)',
                      margin: '0 0 0.125rem', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {u.full_name ?? '—'}
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
                      color: 'var(--color-text-muted)', margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {u.email}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {isAdmin && (
                      <span style={{
                        display: 'block',
                        fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 700,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        background: 'var(--color-accent-warm)', color: 'var(--color-ink-deep)',
                        padding: '0.1rem 0.375rem', borderRadius: '0.2rem',
                        marginBottom: '0.2rem',
                      }}>
                        {u.role === 'super_admin' ? 'super' : 'admin'}
                      </span>
                    )}
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: '0.6875rem',
                      color: 'var(--color-text-muted)',
                    }}>
                      {timeAgo(u.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Top performing content */}
        <section style={{
          background: '#ffffff',
          border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
          borderRadius: '0.75rem', overflow: 'hidden',
        }}>
          <div style={{
            padding: '1.25rem 1.5rem 1rem',
            borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 6%, transparent)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
              fontWeight: 700, color: 'var(--color-ink-deep)',
              margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              🏆 Top Content
            </h3>
            <Link href="/admin/content" style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
              color: 'var(--color-text-muted)', textDecoration: 'none', fontWeight: 600,
            }}>
              Manage →
            </Link>
          </div>
          <div>
            {topContent.length === 0 ? (
              <p style={{ padding: '1.5rem', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                No content yet.
              </p>
            ) : topContent.map((c, i) => {
              const colors = TYPE_COLORS[c.type] ?? { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' }
              return (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1.5rem',
                  borderBottom: i < topContent.length - 1 ? '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)' : 'none',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.75rem', fontWeight: 800,
                    color: i === 0 ? 'var(--color-accent-warm)' : 'color-mix(in srgb, var(--color-text-muted) 50%, transparent)',
                    width: '1.25rem', flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                      fontWeight: 600, color: 'var(--color-ink-deep)',
                      margin: '0 0 0.2rem',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c.title}
                    </p>
                    <span style={{
                      fontFamily: 'var(--font-sans)',
                      display: 'inline-flex', padding: '0.1rem 0.4rem',
                      background: colors.bg, color: colors.text,
                      borderRadius: '0.2rem', fontSize: '0.5625rem',
                      fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      {c.type}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{
                      fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                      fontWeight: 700, color: 'var(--color-ink-deep)', margin: '0 0 0.1rem',
                    }}>
                      {(c.view_count ?? 0).toLocaleString()}
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-sans)', fontSize: '0.625rem',
                      color: 'var(--color-text-muted)', margin: 0, textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>
                      views
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* ── Bottom row: Content breakdown + Recent unlocks + Quick nav ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: '1.25rem',
      }}>
        {/* Content by type */}
        <section style={{
          background: '#ffffff',
          border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
          borderRadius: '0.75rem', overflow: 'hidden',
        }}>
          <div style={{
            padding: '1.25rem 1.5rem 1rem',
            borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 6%, transparent)',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
              fontWeight: 700, color: 'var(--color-ink-deep)',
              margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              📊 Content Breakdown
            </h3>
          </div>
          <div style={{ padding: '1rem 1.5rem' }}>
            {Object.entries(byType).length === 0 ? (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                No content yet.
              </p>
            ) : Object.entries(byType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const colors = TYPE_COLORS[type] ?? { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' }
                  const pct = totalContent > 0 ? Math.round((count / totalContent) * 100) : 0
                  return (
                    <div key={type} style={{ marginBottom: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: colors.dot, flexShrink: 0,
                            display: 'inline-block',
                          }} />
                          <span style={{
                            fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
                            color: 'var(--color-ink-deep)', fontWeight: 500,
                            textTransform: 'capitalize',
                          }}>
                            {type}
                          </span>
                        </div>
                        <span style={{
                          fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
                          fontWeight: 700, color: 'var(--color-ink-deep)',
                        }}>
                          {count}
                        </span>
                      </div>
                      <div style={{
                        height: '4px', background: 'var(--color-paper-darker)',
                        borderRadius: '2px', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: colors.dot, borderRadius: '2px',
                        }} />
                      </div>
                    </div>
                  )
                })}
          </div>
        </section>

        {/* Recent unlocks */}
        <section style={{
          background: '#ffffff',
          border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
          borderRadius: '0.75rem', overflow: 'hidden',
        }}>
          <div style={{
            padding: '1.25rem 1.5rem 1rem',
            borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 6%, transparent)',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
              fontWeight: 700, color: 'var(--color-ink-deep)',
              margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              🔓 Recent Unlocks
            </h3>
          </div>
          <div style={{ padding: '0 1.5rem' }}>
            {recentUnlocks.length === 0 ? (
              <p style={{ padding: '1.5rem 0', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                No unlocks yet.
              </p>
            ) : recentUnlocks.map((u, i) => {
              const colors = TYPE_COLORS[u.content?.type ?? ''] ?? { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' }
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  padding: '0.75rem 0',
                  borderBottom: i < recentUnlocks.length - 1 ? '1px solid color-mix(in srgb, var(--color-tertiary) 5%, transparent)' : 'none',
                }}>
                  <span style={{
                    display: 'flex', width: '28px', height: '28px',
                    background: colors.bg, borderRadius: '0.375rem',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', flexShrink: 0,
                  }}>
                    🔓
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
                      fontWeight: 600, color: 'var(--color-ink-deep)',
                      margin: '0 0 0.125rem',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {u.content?.title ?? 'Unknown content'}
                    </p>
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: '0.6875rem',
                      color: 'var(--color-text-muted)',
                    }}>
                      {timeAgo(u.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Quick navigation */}
        <section style={{
          background: 'var(--color-ink-deep)',
          borderRadius: '0.75rem', overflow: 'hidden',
          padding: '1.25rem 1.5rem',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: '-20px', right: '-20px',
            width: '120px', height: '120px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(250,204,21,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <h3 style={{
            fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
            fontWeight: 700, color: 'rgba(255,255,255,0.6)',
            margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { href: '/admin/content/new', label: '+ New Content', primary: true },
              { href: '/admin/users', label: '👥 Manage Users', primary: false },
              { href: '/admin/requests', label: '📝 Content Requests', primary: false },
              { href: '/admin/analytics/platform', label: '📊 Platform Analytics', primary: false },
              { href: '/admin/analytics/growth', label: '🌱 Growth Analytics', primary: false },
              { href: '/admin/support', label: '💬 Support Queue', primary: false },
            ].map(item => (
              <Link key={item.href} href={item.href} style={{
                display: 'block', padding: '0.625rem 0.875rem',
                background: item.primary ? 'var(--color-accent-warm)' : 'rgba(255,255,255,0.06)',
                color: item.primary ? 'var(--color-ink-deep)' : 'rgba(255,255,255,0.75)',
                borderRadius: '0.375rem',
                fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: item.primary ? 700 : 500,
                textDecoration: 'none',
                transition: 'background 150ms, color 150ms',
              }}>
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
