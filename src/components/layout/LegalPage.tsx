import Link from 'next/link'
import { PublicNav } from './PublicNav'
import { PublicFooter } from './PublicFooter'

interface LegalSection {
  heading: string
  body: string
}

interface LegalPageProps {
  title: string
  lastUpdated: string
  intro: string
  sections: LegalSection[]
}

export function LegalPage({ title, lastUpdated, intro, sections }: LegalPageProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav />

      <main style={{ flex: 1, maxWidth: '48rem', margin: '0 auto', width: '100%', padding: '4rem var(--spacing-margin-edge) 6rem' }}>
        <nav style={{ marginBottom: '2.5rem' }}>
          <Link href="/" className="text-label-sm" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            ← Home
          </Link>
        </nav>

        <header style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)' }}>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.75rem' }}>
            {title}
          </h1>
          <p className="text-label-sm" style={{ color: 'var(--color-text-muted)' }}>
            Last updated: {lastUpdated}
          </p>
          {intro && (
            <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginTop: '1rem', lineHeight: 1.75 }}>
              {intro}
            </p>
          )}
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.875rem' }}>
                {section.heading}
              </h2>
              <p className="text-body-md" style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <div style={{
          marginTop: '3rem',
          padding: '1.25rem 1.5rem',
          background: 'var(--color-paper-darker)',
          borderRadius: '0.5rem',
          borderLeft: '3px solid var(--color-accent-warm)',
        }}>
          <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Questions about this policy? <Link href="/contact" style={{ color: 'var(--color-ink-deep)', fontWeight: 600 }}>Contact us</Link>.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
