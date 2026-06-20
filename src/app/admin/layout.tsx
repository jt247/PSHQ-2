import Link from 'next/link'
import { signOutAction } from '@/app/(auth)/actions/auth'
import './admin.css'

const NAV_ITEMS: (null | { href: string; label: string })[] = [
  { href: '/admin',               label: 'Overview' },
  { href: '/admin/content',       label: 'Content' },
  { href: '/admin/users',         label: 'Users' },
  { href: '/admin/support',       label: 'Support' },
  { href: '/admin/requests',      label: 'Content Requests' },
  { href: '/admin/notifications', label: 'Notifications' },
  { href: '/admin/quality',       label: 'Quality Control' },
  { href: '/admin/payments',      label: 'Payments' },
  null,
  { href: '/admin/analytics/platform', label: '📊 Platform' },
  { href: '/admin/analytics/product',  label: '📈 Product' },
  { href: '/admin/analytics/growth',   label: '🌱 Growth' },
  null,
  { href: '/admin/team', label: '👥 Team' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <Link href="/admin">Product Slice HQ</Link>
          <p>Tactical Ops</p>
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
