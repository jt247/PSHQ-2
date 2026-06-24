import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NotificationBell } from '@/components/dashboard/NotificationBell'
import { PshqLogoIcon } from '@/components/layout/PshqLogo'
import { signOutAction } from '@/app/(auth)/actions/auth'
import type { UserRow } from '@/types/database'

/* ── Minimal inline SVG icons ───────────────────────────────── */
function IconOverview() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}
function IconLibrary() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}
function IconBrowse() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}
function IconRequests() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
function IconSupport() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

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
      {/* Fixed sidebar */}
      <aside className="dash-sidebar">
        {/* Brand */}
        <div className="dash-sidebar-brand">
          <Link href="/dashboard" aria-label="Dashboard overview">
            <PshqLogoIcon size={30} color="#FACC15" />
          </Link>
          <div>
            <div className="dash-sidebar-brand-text">Product Slice HQ</div>
            <div className="dash-sidebar-brand-sub">Member Hub</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="dash-sidebar-nav" aria-label="Dashboard navigation">
          {NAV.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="dash-nav-link">
              <Icon />
              {label}
            </Link>
          ))}

          <div className="dash-nav-section">System</div>

          <Link href="/dashboard/support" className="dash-nav-link">
            <IconSupport />
            Support
          </Link>
          <Link href="/dashboard/settings" className="dash-nav-link">
            <IconSettings />
            Settings
          </Link>
        </nav>

        {/* Profile footer — always at bottom */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          {isAdmin && (
            <Link href="/admin" style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              fontSize: '0.6875rem', color: 'var(--color-accent-warm)',
              textDecoration: 'none', fontFamily: 'var(--font-sans)',
              fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              marginBottom: '0.875rem',
            }}>
              Tactical Ops →
            </Link>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'var(--color-accent-warm)',
              color: 'var(--color-ink-deep)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.625rem', fontWeight: 800, flexShrink: 0,
              fontFamily: 'var(--font-sans)', letterSpacing: '0.02em',
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: '0.8125rem', fontWeight: 600, color: '#ffffff',
                margin: 0, fontFamily: 'var(--font-sans)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {profile?.full_name ?? user.email}
              </p>
              <p style={{
                fontSize: '0.5625rem', textTransform: 'uppercase',
                letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)',
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
              padding: 0, fontFamily: 'var(--font-sans)', transition: 'color 150ms',
            }}>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="dash-main">
        <header className="dash-topbar">
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            fontSize: '0.8125rem', color: 'var(--color-text-muted)',
            textDecoration: 'none', fontFamily: 'var(--font-sans)', transition: 'color 150ms',
          }}>
            ← Back to site
          </Link>
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
  { href: '/dashboard',         label: 'Overview',       Icon: IconOverview  },
  { href: '/dashboard/library', label: 'My Library',     Icon: IconLibrary   },
  { href: '/library',           label: 'Browse Library', Icon: IconBrowse    },
  { href: '/dashboard/requests',label: 'Requests',       Icon: IconRequests  },
]
