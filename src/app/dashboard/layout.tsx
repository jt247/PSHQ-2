import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NotificationBell } from '@/components/dashboard/NotificationBell'
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

  return (
    <div style={layout}>
      <header style={headerBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/dashboard" style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#111827', textDecoration: 'none' }}>
            PSHQ
          </Link>
          <span style={{ color: '#e5e7eb' }}>|</span>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {profile?.full_name ?? user.email}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <NotificationBell userId={user.id} />
          {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
            <Link href="/admin" style={{ fontSize: '0.8125rem', color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}>
              Admin panel →
            </Link>
          )}
          <form action={signOutAction}>
            <button type="submit" style={{ fontSize: '0.8125rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div style={body}>
        <nav style={sidebar}>
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} style={navLink}>{label}</Link>
          ))}
        </nav>
        <main style={main}>{children}</main>
      </div>
    </div>
  )
}

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/library', label: 'Browse Library' },
  { href: '/dashboard/requests', label: 'Content Requests' },
  { href: '/dashboard/support', label: 'Support' },
  { href: '/dashboard/settings', label: 'Settings' },
]

const layout: React.CSSProperties = { minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }
const headerBar: React.CSSProperties = { height: '56px', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', position: 'sticky', top: 0, zIndex: 50 }
const body: React.CSSProperties = { display: 'flex', flex: 1 }
const sidebar: React.CSSProperties = { width: '200px', background: '#fff', borderRight: '1px solid #e5e7eb', padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }
const navLink: React.CSSProperties = { display: 'block', padding: '0.5rem 1.25rem', fontSize: '0.875rem', color: '#374151', textDecoration: 'none' }
const main: React.CSSProperties = { flex: 1, overflow: 'auto' }
