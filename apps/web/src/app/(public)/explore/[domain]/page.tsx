import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@pshq/api-client/server'
import { ContentCard } from '@/components/content/ContentCard'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

// Domain hubs are pre-filtered Library views, not a parallel content
// system — every item here is already-tagged Library content (Build
// Prompt 3's domain column). Nothing on this page is domain-specific
// content invented for this route.
const DOMAINS = ['product', 'growth', 'ai', 'building', 'careers', 'leadership'] as const
type Domain = typeof DOMAINS[number]

const DOMAIN_META: Record<Domain, { title: string; description: string; topics: string[] }> = {
  product: { title: 'Product', description: 'Strategy, discovery, research, analytics, roadmapping, and product operations.', topics: ['Strategy', 'Discovery', 'Research', 'Analytics', 'Roadmapping', 'Product Operations', 'Product Marketing'] },
  growth: { title: 'Growth', description: 'Acquisition, activation, retention, monetization, experimentation, and go-to-market.', topics: ['Acquisition', 'Activation', 'Retention', 'Monetization', 'Experimentation', 'GTM'] },
  ai: { title: 'AI', description: 'AI product management, LLM products, AI engineering, prompt engineering, and AI evaluation.', topics: ['AI Product Management', 'LLM Products', 'AI Engineering', 'Prompt Engineering', 'AI Evaluation', 'AI Tools'] },
  building: { title: 'Building', description: 'Software engineering, architecture, prototyping, and AI-assisted development.', topics: ['Software Engineering', 'Architecture', 'Prototyping', 'AI-Assisted Development', 'Startup Building', 'Infrastructure'] },
  careers: { title: 'Careers', description: 'PM careers, technical PM, AI PM, portfolio development, and interview preparation.', topics: ['PM Careers', 'Technical PM', 'AI PM', 'Portfolio Development', 'Interview Preparation', 'Career Transition'] },
  leadership: { title: 'Leadership', description: 'Product leadership, team management, product culture, and stakeholder management.', topics: ['Product Leadership', 'Team Management', 'Product Culture', 'Stakeholder Management', 'Organizational Design'] },
}

// Real, already-published content genuinely tagged for that domain — not a
// domain-matching algorithm, just an honest editorial pick given how small
// the library still is. Left out entirely (rather than forced) where
// nothing tagged for that domain fits.
const FEATURED_BY_DOMAIN: Record<Domain, { kind: 'learning-path' | 'collection'; slug: string } | null> = {
  product: { kind: 'learning-path', slug: 'product-management-fundamentals' },
  ai: { kind: 'learning-path', slug: 'become-an-ai-product-manager' },
  building: { kind: 'learning-path', slug: 'build-your-first-product-with-ai' },
  growth: { kind: 'collection', slug: 'gtm-starter-pack' },
  careers: { kind: 'collection', slug: 'pm-interview-starter-kit' },
  leadership: null,
}

function isDomain(v: string): v is Domain {
  return (DOMAINS as readonly string[]).includes(v)
}

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }): Promise<Metadata> {
  const { domain } = await params
  if (!isDomain(domain)) return { title: 'Not found' }
  const meta = DOMAIN_META[domain]
  return { title: `${meta.title} — Explore Product Slice HQ`, description: meta.description, alternates: { canonical: `/explore/${domain}` } }
}

export default async function DomainHubPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params
  if (!isDomain(domain)) notFound()

  const meta = DOMAIN_META[domain]
  const featured = FEATURED_BY_DOMAIN[domain]
  const service = createServiceClient()

  const [{ data: items }, featuredResult] = await Promise.all([
    service
      .from('content')
      .select('id,title,slug,type,summary,cover_image_url,tags,view_count,upvote_count,published_at,is_coming_soon,needs_review')
      .eq('status', 'published')
      .eq('domain', domain)
      .order('published_at', { ascending: false }),
    featured?.kind === 'learning-path'
      ? service.from('learning_paths').select('slug, title, description').eq('slug', featured.slug).maybeSingle()
      : featured?.kind === 'collection'
        ? service.from('collections').select('slug, title, description').eq('slug', featured.slug).maybeSingle()
        : Promise.resolve({ data: null }),
  ])

  const featuredItem = featuredResult.data as { slug: string; title: string; description: string | null } | null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/library" />

      <main style={{ flex: 1, maxWidth: '80rem', margin: '0 auto', width: '100%', padding: '5rem var(--spacing-margin-edge)' }}>
        <section style={{ maxWidth: '52ch', marginBottom: '2.5rem' }}>
          <p className="text-label-sm" style={{ color: 'var(--color-accent-warm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Explore</p>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.875rem' }}>{meta.title}</h1>
          <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>{meta.description}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {meta.topics.map(t => (
              <span key={t} className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-text-muted)' }}>{t}</span>
            ))}
          </div>
        </section>

        {featuredItem && (
          <Link
            href={featured!.kind === 'learning-path' ? `/learning-paths/${featuredItem.slug}` : `/collections/${featuredItem.slug}`}
            style={{ display: 'block', textDecoration: 'none', padding: '1.5rem', marginBottom: '3rem', borderRadius: '0.5rem', background: 'var(--color-ink-deep)' }}
          >
            <p className="text-label-sm" style={{ color: '#FACC15', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              {featured!.kind === 'learning-path' ? 'Featured Learning Path' : 'Featured Collection'}
            </p>
            <p className="text-headline-sm" style={{ color: '#ffffff', marginBottom: '0.375rem' }}>{featuredItem.title}</p>
            {featuredItem.description && <p className="text-body-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{featuredItem.description}</p>}
          </Link>
        )}

        <h2 className="text-headline-md" style={{ color: 'var(--color-ink-deep)', marginBottom: '1.5rem' }}>{meta.title} Resources</h2>

        {!items || items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)' }}>More {meta.title.toLowerCase()} resources are on the way.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
            {items.map(item => <ContentCard key={item.id} {...item} />)}
          </div>
        )}

        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <Link href={`/library?domain=${domain}`} className="text-label-sm" style={{ color: 'var(--color-ink-deep)' }}>See all {meta.title} resources in the Library →</Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
