import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

const INITIATIVES = [
  {
    title: 'PM Mentorship Network',
    category: 'Community',
    description: 'Connecting emerging product managers with experienced practitioners across Africa for 1:1 mentorship and career guidance.',
    status: 'Active',
  },
  {
    title: 'Open PM Curriculum',
    category: 'Education',
    description: 'A freely available, community-maintained curriculum covering product fundamentals, analytics, strategy, and leadership.',
    status: 'Active',
  },
  {
    title: 'Startup PM Residency',
    category: 'Career',
    description: 'A structured 3-month programme placing talented PMs inside early-stage startups to gain real-world experience.',
    status: 'Coming Soon',
  },
  {
    title: 'Product Case Library',
    category: 'Resources',
    description: 'A growing archive of Africa-specific product case studies documenting how teams built, iterated, and scaled their products.',
    status: 'Active',
  },
]

export default function InitiativesPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/initiatives" />

      <main style={{ flex: 1, maxWidth: '80rem', margin: '0 auto', width: '100%', padding: '5rem var(--spacing-margin-edge)' }}>
        {/* Header */}
        <section style={{ maxWidth: '48ch', marginBottom: '4rem' }}>
          <p className="text-label-sm" style={{ color: 'var(--color-accent-warm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
            Our Work
          </p>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '1rem' }}>Initiatives</h1>
          <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', lineHeight: 1.75 }}>
            Beyond content, we run programmes designed to build the professional infrastructure that product practitioners in Africa need to grow and thrive.
          </p>
        </section>

        {/* Initiatives grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '1.5rem' }}>
          {INITIATIVES.map(item => (
            <article key={item.title} style={{
              background: '#ffffff',
              border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
              borderRadius: '0.5rem',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.875rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <span className="text-label-sm" style={{
                  background: 'color-mix(in srgb, var(--color-ink-deep) 8%, transparent)',
                  color: 'var(--color-ink-deep)',
                  padding: '0.1875rem 0.625rem',
                  borderRadius: '0.125rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  {item.category}
                </span>
                <span className="text-label-sm" style={{
                  color: item.status === 'Active' ? '#15803d' : 'var(--color-text-muted)',
                  fontWeight: 600,
                }}>
                  {item.status === 'Active' ? '● Active' : '○ Coming Soon'}
                </span>
              </div>

              <h2 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: 0 }}>
                {item.title}
              </h2>

              <p className="text-body-md" style={{ color: 'var(--color-text-muted)', lineHeight: 1.65, margin: 0 }}>
                {item.description}
              </p>
            </article>
          ))}
        </div>

        {/* CTA */}
        <section style={{
          marginTop: '4rem',
          padding: '3rem',
          background: 'var(--color-ink-deep)',
          borderRadius: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '1.25rem',
        }}>
          <h2 className="text-headline-lg" style={{ color: '#ffffff', margin: 0, maxWidth: '32ch' }}>
            Want to get involved or propose a new initiative?
          </h2>
          <p className="text-body-md" style={{ color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            We&apos;re always looking for collaborators, mentors, and contributors.
          </p>
          <a href="/contact" className="btn-accent">
            Reach out →
          </a>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
