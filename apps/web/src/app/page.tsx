import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { ContentCard } from '@/components/content/ContentCard'
import { SectionTracker } from '@/components/home/SectionTracker'
import { CtaLink } from '@/components/home/CtaLink'
import { TestimonialCarousel } from '@/components/home/TestimonialCarousel'
import { JsonLd } from '@/components/seo/JsonLd'
import { FaqAccordion } from '@/components/seo/FaqAccordion'
import { faqPageSchema } from '@/lib/seo/schema'
import { HOMEPAGE_FAQ } from '@/lib/seo/faq-content'

export const metadata: Metadata = {
  title: 'Product Management Resources, Ebooks & Templates',
  description:
    'Free product management resources, ebooks, and templates for PMs, designers, and founders. Learn AI-assisted product development, vibe coding, and how to become a product manager in 2026.',
  alternates: { canonical: '/' },
}

const DOMAINS = [
  { slug: 'product', label: 'Product' },
  { slug: 'growth', label: 'Growth' },
  { slug: 'ai', label: 'AI' },
  { slug: 'building', label: 'Building' },
  { slug: 'careers', label: 'Careers' },
  { slug: 'leadership', label: 'Leadership' },
] as const

export default async function HomePage() {
  const supabase = await createClient()
  const service = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    learningPathsResult,
    practicalResourcesResult,
    buildNotesResult,
    casesResult,
    productLabResult,
  ] = await Promise.all([
    service.from('learning_paths').select('slug, title, description, level, estimated_time_minutes').eq('status', 'published').order('display_order').limit(3),
    service.from('content').select('id,title,slug,type,summary,cover_image_url,tags,view_count,upvote_count,published_at,is_coming_soon').eq('status', 'published').in('type', ['template', 'ebook', 'guide']).order('published_at', { ascending: false }).limit(3),
    service.from('content').select('id,title,slug,type,summary,cover_image_url,tags,view_count,upvote_count,published_at,is_coming_soon').eq('status', 'published').eq('type', 'build_note').order('published_at', { ascending: false }).limit(3),
    service.from('case_library_entries').select('id, slug, title, company_name, description, logo_url').eq('status', 'published').not('slug', 'is', null).order('published_at', { ascending: false }).limit(3),
    service.from('initiative_editions').select('slug, edition_number, title, focus_description, status, pricing').eq('edition_number', '3.0').maybeSingle(),
  ])

  const learningPaths = learningPathsResult.data ?? []
  const practicalResources = practicalResourcesResult.data ?? []
  const buildNotes = buildNotesResult.data ?? []
  const cases = casesResult.data ?? []
  const productLabEdition = productLabResult.data

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav />

      <main style={{ flex: 1 }}>

        {/* ── 3.1 Hero ─────────────────────────────────────────────── */}
        <section style={{
          minHeight: '85vh', display: 'flex', alignItems: 'center',
          background: 'var(--color-ink-deep)', position: 'relative', overflow: 'hidden',
          padding: '6rem var(--spacing-margin-edge) 5rem',
        }}>
          <SectionTracker section="hero" />
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `
              radial-gradient(ellipse 70% 60% at 80% 20%, rgba(250,204,21,0.07) 0%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 10% 90%, rgba(99,102,241,0.06) 0%, transparent 60%)
            `,
          }} />
          <div style={{ maxWidth: '52rem', margin: '0 auto', width: '100%', position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.875rem',
              background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.25)',
              borderRadius: '0.125rem', marginBottom: '1.5rem',
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#FACC15' }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#FACC15' }}>
                Completely Free
              </span>
            </span>

            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.25rem, 5vw, 3.75rem)', fontWeight: 700, color: '#ffffff', margin: '0 0 1.25rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              Practical knowledge for people building technology products.
            </h1>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.125rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: '46ch', margin: '0 auto 2.5rem' }}>
              Learn product, growth, AI, technology, startup execution, and leadership from real-world practice.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <CtaLink href={user ? '/dashboard' : '/sign-up'} section="hero" label="Start Learning Free" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#FACC15', color: '#0E2A47',
                fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.9375rem', padding: '0.875rem 2rem',
                borderRadius: '0.25rem', textDecoration: 'none',
              }}>
                {user ? 'Go to Dashboard' : 'Start Learning Free'} →
              </CtaLink>
              <CtaLink href="/library" section="hero" label="Explore ProductSlice" style={{
                display: 'inline-flex', alignItems: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.9375rem',
                padding: '0.875rem 2rem', borderRadius: '0.25rem', textDecoration: 'none',
              }}>
                Explore ProductSlice
              </CtaLink>
            </div>
          </div>
        </section>

        {/* ── 3.2 Choose Your Direction ────────────────────────────── */}
        <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-darker)' }}>
          <SectionTracker section="choose_your_direction" />
          <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
            <div style={{ maxWidth: '42ch', marginBottom: '2.5rem' }}>
              <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>Choose Your Direction</p>
              <h2 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)' }}>Six ways in — pick where you want to grow.</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
              {DOMAINS.map(d => (
                <Link key={d.slug} href={`/explore/${d.slug}`} style={{
                  display: 'block', padding: '1.75rem 1.25rem', borderRadius: '0.5rem', textDecoration: 'none',
                  background: 'var(--color-paper-base)', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
                  transition: 'transform 200ms',
                }} className="bento-feature-card">
                  <p className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: 0 }}>{d.label}</p>
                  <span className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', marginTop: '0.5rem', display: 'inline-block' }}>Explore →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3.3 Start With a Learning Path ───────────────────────── */}
        {learningPaths.length > 0 && (
          <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-base)' }}>
            <SectionTracker section="learning_paths" />
            <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
              <SectionHeader eyebrow="Start With a Learning Path" title="Ordered routes to a real outcome." href="/learning-paths" cta="Explore Learning Paths" section="learning_paths" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
                {learningPaths.map(p => (
                  <Link key={p.slug} href={`/learning-paths/${p.slug}`} style={{ display: 'block', textDecoration: 'none', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)', background: 'var(--color-paper-darker)' }}>
                    {p.level && <span className="badge" style={{ background: 'var(--color-paper-base)', color: 'var(--color-ink-deep)', textTransform: 'capitalize', marginBottom: '0.75rem', display: 'inline-block' }}>{p.level}</span>}
                    <p className="text-body-lg" style={{ fontWeight: 700, color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>{p.title}</p>
                    {p.description && <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>{p.description}</p>}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── 3.4 Practical Resources ──────────────────────────────── */}
        {practicalResources.length > 0 && (
          <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-darker)' }}>
            <SectionTracker section="practical_resources" />
            <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
              <SectionHeader eyebrow="Practical Resources" title="Templates, guides, and ebooks you can use today." href="/library" cta="Explore Library" section="practical_resources" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
                {practicalResources.map(item => <ContentCard key={item.id} {...item} />)}
              </div>
            </div>
          </section>
        )}

        {/* ── 3.5 JT Build Notes ───────────────────────────────────── */}
        {buildNotes.length > 0 && (
          <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-base)' }}>
            <SectionTracker section="build_notes" />
            <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
              <SectionHeader eyebrow="JT Build Notes" title="Lessons from building, shipping, breaking, growing, and operating real products." href="/build-notes" cta="All Build Notes" section="build_notes" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
                {buildNotes.map(item => <ContentCard key={item.id} {...item} />)}
              </div>
            </div>
          </section>
        )}

        {/* ── 3.6 Case Library ─────────────────────────────────────── */}
        {cases.length > 0 && (
          <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-darker)' }}>
            <SectionTracker section="case_library" />
            <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
              <SectionHeader eyebrow="Product Case Library" title="Real product teardowns, not press releases." href="/cases" cta="Explore Product Cases" section="case_library" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
                {cases.map(c => (
                  <Link key={c.id} href={`/cases/${c.slug}`} style={{ display: 'block', textDecoration: 'none', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)', background: 'var(--color-paper-base)' }}>
                    <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>{c.company_name}</p>
                    <p className="text-body-lg" style={{ fontWeight: 700, color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>{c.title}</p>
                    {c.description && <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{c.description}</p>}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── 3.7 Product Lab ──────────────────────────────────────── */}
        {productLabEdition && (
          <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-ink-deep)' }}>
            <SectionTracker section="product_lab" />
            <div style={{ maxWidth: '48rem', margin: '0 auto', textAlign: 'center' }}>
              <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FACC15', marginBottom: '0.75rem' }}>Product Lab with JT</p>
              <h2 className="text-headline-lg" style={{ color: '#ffffff', marginBottom: '1rem' }}>
                {productLabEdition.status === 'coming_soon' ? 'Coming up next' : 'Latest session'}: {productLabEdition.title}
              </h2>
              {productLabEdition.focus_description && (
                <p className="text-body-lg" style={{ color: 'rgba(255,255,255,0.65)', marginBottom: '2rem' }}>{productLabEdition.focus_description}</p>
              )}
              <CtaLink href="/initiatives/product-lab" section="product_lab" label="See Product Lab" style={{
                display: 'inline-flex', alignItems: 'center', background: '#FACC15', color: '#0E2A47',
                fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.9375rem', padding: '0.875rem 2rem',
                borderRadius: '0.25rem', textDecoration: 'none',
              }}>
                See Product Lab →
              </CtaLink>
            </div>
          </section>
        )}

        {/* ── 3.8 Open PM Curriculum ───────────────────────────────── */}
        <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-darker)' }}>
          <SectionTracker section="curriculum" />
          <div style={{ maxWidth: '48rem', margin: '0 auto', textAlign: 'center' }}>
            <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>Open PM Curriculum</p>
            <h2 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '1rem' }}>The comprehensive, canonical curriculum.</h2>
            <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              Distinct from a Learning Path, which targets one specific outcome — this is everything, structured module by module.
            </p>
            <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '2rem' }}>
              Interim version, actively being expanded by JT.
            </p>
            <CtaLink href="/initiatives/open-pm-curriculum" section="curriculum" label="Explore Curriculum" className="btn-accent">
              Explore Curriculum →
            </CtaLink>
          </div>
        </section>

        {/* ── 3.9 Community Proof ──────────────────────────────────── */}
        <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-base)' }}>
          <SectionTracker section="community_proof" />
          <div style={{ maxWidth: '48ch', margin: '0 auto 2.5rem', textAlign: 'center' }}>
            <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>What Members Say</p>
            <h2 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)' }}>Real feedback, from real practitioners.</h2>
          </div>
          <TestimonialCarousel />
        </section>

        {/* ── 3.10 Community Activity — deliberately not public. Per JT:
             analytics belongs in the admin dashboard, not the public
             homepage. Member/completion/path-start counts live in
             apps/admin instead (content analytics + growth pages). ── */}

        {/* ── 3.11 Final CTA ───────────────────────────────────────── */}
        {!user && (
          <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-ink-deep)' }}>
            <SectionTracker section="final_cta" />
            <div style={{ maxWidth: '80rem', margin: '0 auto', textAlign: 'center' }}>
              <h2 className="text-headline-lg" style={{ color: '#ffffff', marginBottom: '1rem' }}>Build better products. Learn from practice.</h2>
              <p className="text-body-lg" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', maxWidth: '44ch', margin: '0 auto 2rem' }}>
                Join product managers across Africa who are building with intention.
              </p>
              <CtaLink href="/sign-up" section="final_cta" label="Join ProductSlice Free" style={{
                display: 'inline-flex', alignItems: 'center', background: '#FACC15', color: '#0E2A47',
                fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.9375rem', padding: '0.875rem 2rem',
                borderRadius: '0.25rem', textDecoration: 'none',
              }}>
                Join ProductSlice Free →
              </CtaLink>
            </div>
          </section>
        )}

        {/* ── FAQ — kept from the previous homepage, still serves real
             search intent and "who this is for" framing. ── */}
        <section style={{ padding: '5rem var(--spacing-margin-edge)', background: 'var(--color-paper-base)' }}>
          <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
            <p className="text-label-md" style={{ color: 'var(--color-accent-warm)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', textAlign: 'center' }}>
              Frequently asked
            </p>
            <h2 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', marginBottom: '1rem', textAlign: 'center' }}>
              Product management resources, answered plainly.
            </h2>
            <FaqAccordion items={HOMEPAGE_FAQ} />
          </div>
        </section>
        <JsonLd data={faqPageSchema(HOMEPAGE_FAQ.map(f => ({ question: f.question, answer: f.answer })))} />
      </main>

      <PublicFooter />

      <style>{`
        .bento-feature-card:hover { transform: translateY(-2px); }
      `}</style>
    </div>
  )
}

function SectionHeader({ eyebrow, title, href, cta, section }: { eyebrow: string; title: string; href: string; cta: string; section: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
      <div>
        <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>{eyebrow}</p>
        <h2 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', margin: 0 }}>{title}</h2>
      </div>
      <CtaLink href={href} section={section} label={cta} className="text-label-sm" style={{ color: 'var(--color-on-primary-container)', textDecoration: 'none' }}>
        {cta} →
      </CtaLink>
    </div>
  )
}
