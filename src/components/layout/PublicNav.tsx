import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface PublicNavProps {
  activeHref?: string
}

const NAV_LINKS = [
  { href: '/articles', label: 'Articles' },
  { href: '/library', label: 'Library' },
  { href: '/initiatives', label: 'Initiatives' },
  { href: '/contact', label: 'Contact' },
]

export async function PublicNav({ activeHref }: PublicNavProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="pub-nav">
      <div className="pub-nav-inner">
        <Link href="/" className="pub-nav-brand">Product Slice HQ</Link>

        <nav className="pub-nav-links" aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`pub-nav-link${activeHref === href ? ' active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="pub-nav-actions">
          {user ? (
            <Link href="/dashboard" className="btn-primary" style={{ fontSize: '0.8125rem', padding: '0.5rem 1.125rem' }}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="pub-nav-link" style={{ display: 'none' }}>
                Sign In
              </Link>
              <Link href="/sign-in" style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-ink-deep)',
                textDecoration: 'none',
                display: 'none',
              }} className="md-show">
                Sign In
              </Link>
              <Link href="/sign-up" className="btn-primary" style={{ fontSize: '0.8125rem', padding: '0.5rem 1.125rem' }}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .md-show { display: inline !important; }
        }
      `}</style>
    </header>
  )
}
