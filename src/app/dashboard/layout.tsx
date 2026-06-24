import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NotificationBell } from '@/components/dashboard/NotificationBell'
import { PshqLogoIcon } from '@/components/layout/PshqLogo'
import { signOutAction } from '@/app/(auth)/actions/auth'
import type { UserRow } from '@/types/database'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profileRaw } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as Pick<UserRow, 'full_name' | 'role'> | null

  const initials = (profile?.full_name ?? user.email ?? 'U')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-paper-base)' }}>
      {/* Sidebar */}
      <aside className="dash-sidebar">
        {/* Brand */}
        <div className="dash-sidebar-brand">
          <Link href="/dashboard" aria-label="Dashboard overview">
            <PshqLogoIcon size={32} color="#FACC15" />
          </Link>
          <div>
            <div className="dash-sidebar-brand-text">Product Slice HQ</div>
            <div className="dash-sidebar-brand-sub">Member Hub</div>
          </div>
        </div>

        <nav className="dash-sidebar-nav" aria-label="Dashboard navigation">
          {NAV.map(({ href, label, icon }) => (
            <Link key={href} href={href} className="dash-nav-link">
              <span style={{ fontSize: '1rem', opacity: 0.8 }}>{icon}</span>
              {label}
            </Link>
          ))}

          <div className="dash-nav-section">System</div>

          <Link href="/dashboard/support" className="dash-nav-link">
            <span style={{ fontSize: '1rem', opacity: 0.8 }}>💬</span>
            Support
          </Link>

          <Link href="/dashboard/settings" className="dash-nav-link">
            <span style={{ fontSize: '1rem', opacity: 0.8 }}>⚙️</span>
            Settings
          </Link>
        </nav>

        {/* Profile footer */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          {isAdmin && (
            <Link href="/admin" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontSize: '0.75rem',
              color: 'var(--color-accent-warm)',
              textDecoration: 'none',
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              opacity: 0.9,
              transition: 'opacity 150ms',
            }}>
              ⚡ Tactical Ops
            </Link>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'var(--color-accent-warm)',
              color: 'var(--color-ink-deep)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6875rem', fontWeight: 800, flexShrink: 0,
              fontFamily: 'var(--font-sans)',
              letterSpacing: '0.02em',
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: '0.8125rem', fontWeight: 600,
                color: '#ffffff',
                margin: 0, fontFamily: 'var(--font-sans)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {profile?.full_name ?? user.email}
              </p>
              <p style={{
                fontSize: '0.5625rem', textTransform: 'uppercase',
                letterSpacing: '0.16em', color: 'rgba(255,255,255,0.4)',
                margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 600,
              }}>
                {profile?.role === 'super_admin' ? 'Super Admin' : profile?.role === 'admin' ? 'Admin' : 'Member'}
              </p>
            </div>
          </div>

          <form action={signOutAction}>
            <button type="submit" style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              fontSize: '0.8125rem', color: 'rgba(255,255,255,0.35)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, fontFamily: 'var(--font-sans)',
              transition: 'color 150ms',
            }}>
              ↩ Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="dash-main">
        {/* Top bar */}
        <header className="dash-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/" style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              fontSize: '0.8125rem', color: 'var(--color-text-muted)',
              textDecoration: 'none', fontFamily: 'var(--font-sans)', transition: 'color 150ms',
            }}>
              <span style={{ fontSize: '0.75rem' }}>←</span> Back to site
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <NotificationBell userId={user.id} />
          </div>
        </header>

        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: '⊞' },
  { href: '/dashboard/library', label: 'My Library', icon: '◫' },
  { href: '/library', label: 'Browse Library', icon: '⊟' },
  { href: '/dashboard/requests', label: 'Requests', icon: '◈' },
]
