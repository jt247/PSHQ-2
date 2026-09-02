import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { MobileNavToggle } from '@/components/layout/MobileNavToggle'
import { signOutAction, webUrl } from '@/lib/auth/actions'
import './admin.css'

const ADMIN_ROLES = ['admin', 'super_admin'] as const

// This app IS the admin panel now (separate deployment from apps/web), so
// routes live at its own root — no more '/' prefix.
const NAV_ITEMS: (null | { href: string; label: string })[] = [
  { href: '/',               label: 'Overview' },
  { href: '/content',        label: 'Content' },
  { href: '/learning-paths', label: 'Learning Paths' },
  { href: '/collections',    label: 'Collections' },
  { href: '/users',          label: 'Users' },
  { href: '/support',        label: 'Support & Feedback' },
  { href: '/notifications',  label: 'Notifications' },
  { href: '/moderation',     label: 'Comment Moderation' },
  { href: '/ai-review',      label: 'AI Interaction Review' },
  { href: '/quality',        label: 'Quality Control' },
  { href: '/community',      label: 'Community Scoring' },
  null,
  { href: '/initiatives',                      label: 'Initiatives' },
  { href: '/initiatives/product-lab',          label: '   ↳ Product Lab' },
  { href: '/initiatives/case-library',         label: '   ↳ Case Library' },
  { href: '/initiatives/curriculum',           label: '   ↳ Curriculum' },
  null,
  { href: '/analytics/platform', label: 'Platform Analytics' },
  { href: '/analytics/product',  label: 'Product Analytics' },
  { href: '/analytics/growth',   label: 'Growth Analytics' },
  { href: '/analytics/funnel',   label: 'Product Funnel' },
  { href: '/analytics/content',  label: 'Content Analytics' },
  { href: '/analytics/search',   label: 'Search Analytics' },
  { href: '/analytics/users',    label: 'User Analytics' },
  { href: '/analytics/learning', label: 'Learning Analytics' },
  null,
  { href: '/team', label: 'Team' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`${webUrl()}/sign-in`)

  // Use service client to bypass RLS for role check
  const service = createServiceClient()
  const { data: profile } = await service
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || !ADMIN_ROLES.includes(profile.role as typeof ADMIN_ROLES[number])) {
    redirect(`${webUrl()}/dashboard`)
  }

  const isSuperAdmin = profile.role === 'super_admin'

  // Found during the Epic G/H verification sweep — this root layout was
  // missing the <html>/<body> wrapper Next.js requires (Next 16 surfaces it
  // as a runtime error; older/production builds may have tolerated it
  // silently). Pre-existing, not introduced by Epic G or H — neither epic
  // touched anything but NAV_ITEMS in this file.
  return (
    <html lang="en">
      <body>
        <div className="admin-layout">
          <aside className="admin-sidebar">
            <div className="admin-logo">
              <Link href="/">Product Slice HQ</Link>
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
              <a href={`${webUrl()}/dashboard`} className="admin-nav-link">← Dashboard</a>
              <form action={signOutAction}>
                <button type="submit" className="admin-signout">Sign out</button>
              </form>
            </div>
          </aside>
          <header className="admin-mobile-topbar">
            <MobileNavToggle openBodyClass="admin-nav-open" color="var(--color-ink-deep)" />
            <span className="admin-mobile-topbar-label">Tactical Ops</span>
          </header>
          <main className="admin-main">{children}</main>
        </div>
      </body>
    </html>
  )
}
