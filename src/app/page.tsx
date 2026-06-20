import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav />

      <main style={{ flex: 1 }}>
        {/* Hero */}
        <section style={{
          minHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--color-paper-base)',
          padding: '5rem var(--spacing-margin-edge)',
        }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: '4rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.75rem',
                background: 'color-mix(in srgb, var(--color-accent-warm) 20%, transparent)',
                borderRadius: '0.125rem',
                width: 'fit-content',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent-warm)', display: 'inline-block' }} />
                <span className="text-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-ink-deep)' }}>
                  The Thoughtful Creator
                </span>
              </span>

              <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', maxWidth: '14ch' }}>
                Practical Product Thinking for Real-World Builders.
              </h1>

              <p className="text-body-lg" style={{ color: 'var(--color-on-surface-variant)', maxWidth: '44ch' }}>
                Master your craft with editorial-grade insights, templates, and courses designed for product managers across Africa. No fluff, just structure.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <Link href={user ? '/dashboard' : '/sign-up'} className="btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '0.9375rem' }}>
                  {user ? 'Go to Dashboard' : 'Get Started'}
                </Link>
                <Link href="/library" className="btn-outline" style={{ padding: '0.875rem 2rem', fontSize: '0.9375rem' }}>
                  Browse Library
                </Link>
              </div>
            </div>

            {/* Right side visual */}
            <div style={{ position: 'relative' }}>
              <div style={{
                aspectRatio: '1',
                borderRadius: '0.75rem',
                border: '1px solid color-mix(in srgb, var(--color-outline-variant) 30%, transparent)',
                overflow: 'hidden',
                background: 'var(--color-paper-darker)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  {/* Editorial decorative block */}
                  <div style={{ width: '80px', height: '80px', background: 'var(--color-ink-deep)', borderRadius: '50%', margin: '0 auto 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/pshq-logo.svg" alt="PSHQ" width={48} height={48} />
                  </div>
                  <p className="text-headline-md" style={{ color: 'var(--color-ink-deep)', marginBottom: '1rem' }}>
                    "Great products start with<br/>deep understanding."
                  </p>
                  <div style={{ width: '40px', height: '3px', background: 'var(--color-accent-warm)', margin: '0 auto' }} />
                </div>
              </div>

              {/* Floating insight card */}
              <div style={{
                position: 'absolute',
                bottom: '-1rem',
                left: '-1rem',
                background: 'var(--color-paper-base)',
                borderLeft: '4px solid var(--color-accent-warm)',
                padding: '1rem 1.25rem',
                boxShadow: '0 8px 30px color-mix(in srgb, var(--color-ink-deep) 10%, transparent)',
                maxWidth: '220px',
              }}>
                <p className="text-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Community</p>
                <p className="text-headline-md" style={{ fontSize: '1.125rem', color: 'var(--color-ink-deep)', margin: 0 }}>Built for African PMs</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-darker)' }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
            <div style={{ maxWidth: '42ch', marginBottom: '3rem' }}>
              <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>
                What we offer
              </p>
              <h2 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '1rem' }}>
                Your space for synthesis and deep work.
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
              {[
                {
                  href: '/library',
                  label: 'Resource Library',
                  desc: 'Templates, ebooks, and courses built for the African PM context. Practical tools you can apply immediately.',
                  icon: '📚',
                },
                {
                  href: '/articles',
                  label: 'Articles',
                  desc: 'Frameworks and insights from practitioners across the continent. Deep reading for deep thinkers.',
                  icon: '✍️',
                },
                {
                  href: '/initiatives',
                  label: 'Initiatives',
                  desc: 'Community programs, cohorts, and events. Hands-on learning with fellow builders.',
                  icon: '🚀',
                },
              ].map(({ href, label, desc, icon }) => (
                <Link key={href} href={href} style={{
                  display: 'block',
                  background: 'var(--color-paper-base)',
                  border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
                  borderRadius: '0.5rem',
                  padding: '1.75rem',
                  textDecoration: 'none',
                  transition: 'transform 200ms, box-shadow 200ms',
                }} className="bento-feature-card">
                  <span style={{ fontSize: '1.75rem', display: 'block', marginBottom: '1rem' }}>{icon}</span>
                  <h3 className="text-headline-md" style={{ fontSize: '1.125rem', color: 'var(--color-ink-deep)', margin: '0 0 0.625rem' }}>{label}</h3>
                  <p className="text-body-md" style={{ color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.7 }}>{desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        {!user && (
          <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-ink-deep)' }}>
            <div style={{ maxWidth: '80rem', margin: '0 auto', textAlign: 'center' }}>
              <h2 className="text-headline-lg" style={{ color: '#ffffff', marginBottom: '1rem' }}>
                Ready to level up your PM craft?
              </h2>
              <p className="text-body-lg" style={{ color: 'var(--color-primary-fixed-dim)', marginBottom: '2rem', maxWidth: '44ch', margin: '0 auto 2rem' }}>
                Join thousands of product managers across Africa who are building with intention.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/sign-up" className="btn-accent" style={{ padding: '0.875rem 2rem', fontSize: '0.9375rem' }}>
                  Join free →
                </Link>
                <Link href="/library" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.875rem 2rem',
                  border: '1px solid rgba(175,200,237,0.4)',
                  borderRadius: '0.25rem',
                  color: 'var(--color-primary-fixed-dim)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'border-color 150ms',
                }}>
                  Browse the library
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <PublicFooter />

      <style>{`
        .bento-feature-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px color-mix(in srgb, var(--color-ink-deep) 8%, transparent);
        }
      `}</style>
    </div>
  )
}
