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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-paper-base)' }}>
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-brand">
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Dashboard overview">
            <PshqLogoIcon size={36} color="#ffffff" />
          </Link>
        </div>

        <nav className="dash-sidebar-nav" aria-label="Dashboard navigation">
          {NAV.map(({ href, label, icon }) => (
            <Link key={href} href={href} className="dash-nav-link">
              <span style={{ fontSize: '1.125rem' }}>{icon}</span>
              {label}
            </Link>
          ))}

          <div className="dash-nav-section">System</div>

          <Link href="/dashboard/support" className="dash-nav-link">
            <span style={{ fontSize: '1.125rem' }}>💬</span>
            Support
          </Link>

          <Link href="/dashboard/settings" className="dash-nav-link">
            <span style={{ fontSize: '1.125rem' }}>⚙️</span>
            Settings
          </Link>
        </nav>

        {/* Profile + sign out */}
        <div style={{ padding: '1rem', borderTop: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)' }}>
          {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
            <Link href="/admin" style={{
              display: 'block',
              marginBottom: '0.75rem',
              fontSize: '0.8125rem',
              color: 'var(--color-on-primary-container)',
              textDecoration: 'none',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
            }}>
              Tactical Ops →
            </Link>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'var(--color-ink-deep)',
              color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
              fontFamily: 'var(--font-sans)',
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-ink-deep)', margin: 0, fontFamily: 'var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name ?? user.email}
              </p>
              <p style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--color-on-primary-container)', margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                {profile?.role === 'super_admin' ? 'Super Admin' : profile?.role === 'admin' ? 'Admin' : 'Member'}
              </p>
            </div>
          </div>
          <form action={signOutAction}>
            <button type="submit" style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              fontSize: '0.875rem', color: 'var(--color-text-muted)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0.375rem 0', fontFamily: 'var(--font-sans)',
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
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)', textDecoration: 'none', fontFamily: 'var(--font-sans)', transition: 'color 150ms' }}>
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
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/library', label: 'My Library', icon: '📚' },
  { href: '/library', label: 'Browse Library', icon: '🔍' },
  { href: '/dashboard/requests', label: 'Requests', icon: '💡' },
]
