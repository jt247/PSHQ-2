import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div style={page}>
      {/* Nav */}
      <nav style={nav}>
        <Link href="/" style={logo}>PSHQ</Link>
        <div style={navLinks}>
          <Link href="/library" style={navLink}>Library</Link>
          <Link href="/articles" style={navLink}>Articles</Link>
          <Link href="/initiatives" style={navLink}>Initiatives</Link>
          <Link href="/contact" style={navLink}>Contact</Link>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {user ? (
            <Link href="/dashboard" style={btnPrimary}>Dashboard →</Link>
          ) : (
            <>
              <Link href="/sign-in" style={btnGhost}>Sign in</Link>
              <Link href="/sign-up" style={btnPrimary}>Get started</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main style={hero}>
        <div style={heroInner}>
          <p style={eyebrow}>For African product managers</p>
          <h1 style={h1}>Build better products.<br />Learn from the best.</h1>
          <p style={heroSub}>
            Resources, frameworks, and community for PMs across Africa —
            articles, templates, ebooks, and courses all in one place.
          </p>
          <div style={heroCtas}>
            <Link href="/library" style={btnPrimary}>Browse library</Link>
            <Link href="/sign-up" style={btnOutline}>Join free</Link>
          </div>
        </div>
      </main>

      {/* Quick links */}
      <section style={section}>
        <div style={grid3}>
          <FeatureCard
            href="/library"
            icon="📚"
            title="Resource Library"
            desc="Templates, ebooks, and courses built for the African PM context."
          />
          <FeatureCard
            href="/articles"
            icon="✍️"
            title="Articles"
            desc="Frameworks and insights from practitioners across the continent."
          />
          <FeatureCard
            href="/initiatives"
            icon="🚀"
            title="Initiatives"
            desc="Community programs, cohorts, and events you can participate in."
          />
        </div>
      </section>

      {/* Footer */}
      <footer style={footer}>
        <span style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>© 2024 ProductSlice HQ</span>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <Link href="/contact" style={footerLink}>Contact</Link>
          <Link href="/sign-in" style={footerLink}>Sign in</Link>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} style={card}>
      <span style={{ fontSize: '1.75rem' }}>{icon}</span>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0.625rem 0 0.375rem' }}>{title}</h3>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{desc}</p>
    </Link>
  )
}

const page: React.CSSProperties = { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }
const nav: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #f3f4f6', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', zIndex: 10 }
const logo: React.CSSProperties = { fontSize: '1.125rem', fontWeight: 800, color: '#111827', textDecoration: 'none', letterSpacing: '-0.03em' }
const navLinks: React.CSSProperties = { display: 'flex', gap: '1.75rem', alignItems: 'center' }
const navLink: React.CSSProperties = { color: '#374151', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 500 }
const btnPrimary: React.CSSProperties = { background: '#111827', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }
const btnGhost: React.CSSProperties = { color: '#374151', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }
const btnOutline: React.CSSProperties = { border: '1.5px solid #d1d5db', color: '#374151', padding: '0.5rem 1.25rem', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }
const hero: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem 4rem', textAlign: 'center' }
const heroInner: React.CSSProperties = { maxWidth: '640px' }
const eyebrow: React.CSSProperties = { fontSize: '0.8125rem', fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 1rem' }
const h1: React.CSSProperties = { fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 800, color: '#111827', lineHeight: 1.15, margin: '0 0 1.25rem', letterSpacing: '-0.03em' }
const heroSub: React.CSSProperties = { fontSize: '1.125rem', color: '#6b7280', lineHeight: 1.7, margin: '0 0 2rem' }
const heroCtas: React.CSSProperties = { display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }
const section: React.CSSProperties = { padding: '3rem 2rem 4rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }
const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }
const card: React.CSSProperties = { display: 'block', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '12px', textDecoration: 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }
const footer: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', borderTop: '1px solid #f3f4f6' }
const footerLink: React.CSSProperties = { color: '#9ca3af', fontSize: '0.8125rem', textDecoration: 'none' }
