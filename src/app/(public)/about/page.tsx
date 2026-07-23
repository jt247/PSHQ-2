import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { JsonLd } from '@/components/seo/JsonLd'
import { personSchema } from '@/lib/seo/schema'
import { AUTHOR, SITE_NAME } from '@/lib/seo/constants'

export const metadata: Metadata = {
  title: 'About Joshua Theophilus & Product Slice HQ',
  description:
    'Meet Joshua Theophilus — Top 1% ADPList mentor, ex-Meta Lead Trainer, and founder of Product Slice HQ, a free platform for AI-assisted product development.',
  alternates: { canonical: '/about' },
}

const CREDENTIALS = [
  'Top 1% Mentor on ADPList',
  'Ex-Meta Lead Trainer, 9x Blueprint Certified',
  'Trained and mentored 50,000+ people across 65+ countries',
  'NVIDIA Inception program and AWS startup program member',
  'Founder Institute Lagos alumnus, Class President and Top of Class',
]

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-paper-base)' }}>
      <JsonLd data={personSchema()} />
      <PublicNav />

      <main style={{ maxWidth: '44rem', margin: '0 auto', padding: '4rem var(--spacing-margin-edge) 5rem' }}>
        <p className="text-label-md" style={{ color: 'var(--color-accent-warm)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
          About
        </p>
        <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', margin: '0 0 1.5rem' }}>
          {AUTHOR.name}
        </h1>
        <p className="text-body-lg" style={{ color: 'var(--color-text-main)', lineHeight: 1.85, marginBottom: '1.5rem' }}>
          {AUTHOR.bio}
        </p>
        <p className="text-body-lg" style={{ color: 'var(--color-text-main)', lineHeight: 1.85, marginBottom: '2.5rem' }}>
          He founded {SITE_NAME} to give product managers, designers, marketers, and founders a free, practical
          alternative to expensive certification programs — teaching AI-assisted product development, real product
          craft, and how to ship using modern AI tools rather than theory alone.
        </p>

        <h2 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', marginBottom: '1rem' }}>
          Credentials
        </h2>
        <ul style={{ margin: '0 0 2.5rem', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {CREDENTIALS.map(c => (
            <li key={c} className="text-body-md" style={{ color: 'var(--color-text-muted)', display: 'flex', gap: '0.625rem', lineHeight: 1.6 }}>
              <span aria-hidden="true" style={{ color: 'var(--color-accent-warm)', flexShrink: 0 }}>—</span>
              {c}
            </li>
          ))}
        </ul>

        <h2 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', marginBottom: '1rem' }}>
          Elsewhere
        </h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href={AUTHOR.url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: 'none' }}>
            joshuatheophilus.com
          </Link>
          <Link href={AUTHOR.adpListUrl} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', padding: '0.625rem 1.25rem',
            border: '1px solid color-mix(in srgb, var(--color-tertiary) 20%, transparent)',
            borderRadius: '0.25rem', color: 'var(--color-ink-deep)', textDecoration: 'none',
            fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600,
          }}>
            ADPList Profile ↗
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
