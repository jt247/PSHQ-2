import Link from 'next/link'

export function PublicFooter() {
  return (
    <footer className="pub-footer">
      <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem' }}>
        <div>
          <p className="text-headline-md" style={{ color: '#ffffff', marginBottom: '0.75rem' }}>Product Slice HQ</p>
          <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--color-primary-fixed-dim)', maxWidth: '26ch' }}>
            Practical product thinking for real-world builders across Africa.
          </p>
        </div>

        <div>
          <p className="text-label-md" style={{ color: 'var(--color-primary-fixed-dim)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Explore
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[
              { href: '/articles', label: 'Articles' },
              { href: '/library', label: 'Library' },
              { href: '/initiatives', label: 'Initiatives' },
              { href: '/contact', label: 'Contact' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{ fontSize: '0.9375rem', color: 'var(--color-primary-fixed-dim)', opacity: 0.8, transition: 'opacity 150ms', textDecoration: 'none' }}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-label-md" style={{ color: 'var(--color-primary-fixed-dim)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Legal
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[
              { href: '/privacy-policy', label: 'Privacy Policy' },
              { href: '/terms', label: 'Terms of Service' },
              { href: '/cookie-policy', label: 'Cookie Policy' },
              { href: '/refund-policy', label: 'Refund Policy' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{ fontSize: '0.9375rem', color: 'var(--color-primary-fixed-dim)', opacity: 0.8, transition: 'opacity 150ms', textDecoration: 'none' }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '80rem', margin: '3rem auto 0', paddingTop: '1.5rem', borderTop: '1px solid rgba(175,200,237,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-primary-fixed-dim)', opacity: 0.6 }}>
          © {new Date().getFullYear()} Product Slice HQ. All rights reserved.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <Link href="/sign-in" style={{ fontSize: '0.8125rem', color: 'var(--color-primary-fixed-dim)', opacity: 0.6, textDecoration: 'none' }}>Sign in</Link>
          <Link href="/sign-up" style={{ fontSize: '0.8125rem', color: 'var(--color-primary-fixed-dim)', opacity: 0.6, textDecoration: 'none' }}>Get started</Link>
        </div>
      </div>
    </footer>
  )
}
