import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { signOutAction } from '@/app/(auth)/actions/auth'
import './admin.css'

const ADMIN_ROLES = ['admin', 'super_admin'] as const

const NAV_ITEMS: (null | { href: string; label: string })[] = [
  { href: '/admin',               label: 'Overview' },
  { href: '/admin/content',       label: 'Content' },
  { href: '/admin/users',         label: 'Users' },
  { href: '/admin/support',       label: 'Support' },
  { href: '/admin/requests',      label: 'Content Requests' },
  { href: '/admin/notifications', label: 'Notifications' },
  { href: '/admin/quality',       label: 'Quality Control' },
  null,
  { href: '/admin/initiatives',                      label: 'Initiatives' },
  { href: '/admin/initiatives/product-lab',          label: '   ↳ Product Lab' },
  { href: '/admin/initiatives/case-library',         label: '   ↳ Case Library' },
  { href: '/admin/initiatives/curriculum',           label: '   ↳ Curriculum' },
  null,
  { href: '/admin/analytics/platform', label: 'Platform Analytics' },
  { href: '/admin/analytics/product',  label: 'Product Analytics' },
  { href: '/admin/analytics/growth',   label: 'Growth Analytics' },
  null,
  { href: '/admin/team', label: 'Team' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in?redirect=/admin')

  // Use service client to bypass RLS for role check
  const service = createServiceClient()
  const { data: profile } = await service
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || !ADMIN_ROLES.includes(profile.role as typeof ADMIN_ROLES[number])) {
    redirect('/dashboard')
  }

  const isSuperAdmin = profile.role === 'super_admin'

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <Link href="/admin">Product Slice HQ</Link>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            Tactical Ops
            {isSuperAdmin && (
              <span style={{
                fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', background: 'oklch(55% 0.14 85)',
                color: '#fff', padding: '0.1rem 0.375rem', borderRadius: '0.2rem',
              }}>
                Super Admin
              </span>
            )}
          </p>
        </div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item, i) =>
            item === null
              ? <hr key={i} style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0.5rem 0' }} />
              : <Link key={item.href} href={item.href} className="admin-nav-link">{item.label}</Link>
          )}
        </nav>
        <div className="admin-sidebar-footer">
          <Link href="/dashboard" className="admin-nav-link">← Dashboard</Link>
          <form action={signOutAction}>
            <button type="submit" className="admin-signout">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  )
}
