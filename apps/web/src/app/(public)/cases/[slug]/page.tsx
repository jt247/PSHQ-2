import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { trackContentOpened } from '@pshq/analytics'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { CaseFavoriteButton } from '@/components/content/CaseFavoriteButton'

interface CaseDetail {
  id: string
  slug: string
  title: string
  company_name: string
  description: string | null
  logo_url: string | null
  industry: string | null
  market: string | null
  country: string | null
  stage: string | null
  product: string | null
  problem: string | null
  target_customer: string | null
  market_context: string | null
  business_model: string | null
  product_strategy: string | null
  acquisition: string | null
  activation: string | null
  retention: string | null
  revenue: string | null
  distribution: string | null
  competitive_advantage: string | null
  key_product_decisions: string | null
  what_worked: string | null
  what_did_not_work: string | null
  challenges: string | null
  jt_analysis: string | null
  what_i_would_do_differently: string | null
  key_lessons: string[]
  discussion_questions: string[]
  sources: { label: string; url: string }[]
}

async function getCase(slug: string): Promise<CaseDetail | null> {
  const service = createServiceClient()
  const { data } = await service.from('case_library_entries').select('*').eq('slug', slug).eq('status', 'published').maybeSingle()
  return data as CaseDetail | null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const item = await getCase(slug)
  if (!item) return { title: 'Case not found' }
  return {
    title: `${item.title} — Product Case Library`,
    description: item.description ?? undefined,
    alternates: { canonical: `/cases/${item.slug}` },
  }
}

const FACT_FIELDS: Array<[keyof CaseDetail, string]> = [
  ['industry', 'Industry'], ['market', 'Market'], ['country', 'Country'], ['stage', 'Stage'],
  ['product', 'Product'], ['business_model', 'Business Model'],
]

const NARRATIVE_FIELDS: Array<[keyof CaseDetail, string]> = [
  ['problem', 'Problem'], ['target_customer', 'Target Customer'], ['market_context', 'Market Context'],
  ['product_strategy', 'Product Strategy'], ['acquisition', 'Acquisition'], ['activation', 'Activation'],
  ['retention', 'Retention'], ['revenue', 'Revenue'], ['distribution', 'Distribution'],
  ['competitive_advantage', 'Competitive Advantage'], ['key_product_decisions', 'Key Product Decisions'],
  ['what_worked', 'What Worked'], ['what_did_not_work', 'What Did Not Work'], ['challenges', 'Challenges'],
]

export default async function CaseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const item = await getCase(slug)
  if (!item) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await trackContentOpened({ supabase, source: 'web', userId: user?.id ?? null }, { contentId: item.id, contentType: 'article' })

  let isFavorited = false
  if (user) {
    const { data: fav } = await supabase.from('case_favorites').select('id').eq('case_id', item.id).eq('user_id', user.id).maybeSingle()
    isFavorited = !!fav

    // Real "opened" signal for Continue Learning / Recently Viewed — see
    // migration 20260901000028 for why this can't just be
    // trackContentOpened like every other content type.
    await supabase.from('case_progress').upsert(
      { user_id: user.id, case_id: item.id, last_viewed_at: new Date().toISOString() },
      { onConflict: 'user_id,case_id', ignoreDuplicates: false }
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/cases" />

      <main style={{ flex: 1, maxWidth: '48rem', margin: '0 auto', width: '100%', padding: '4rem var(--spacing-margin-edge) 6rem' }}>
        <Link href="/cases" className="text-label-sm" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>← All cases</Link>

        <header style={{ margin: '1.5rem 0 2.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {item.logo_url ? (
            <img src={item.logo_url} alt={item.company_name} width={56} height={56} style={{ borderRadius: '0.5rem', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: '0.5rem', background: 'var(--color-paper-darker)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--color-text-muted)' }}>
              {item.company_name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', margin: 0 }}>{item.company_name}</p>
            <h1 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', margin: 0 }}>{item.title}</h1>
          </div>
        </header>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
          <CaseFavoriteButton caseId={item.id} initialFavorited={isFavorited} isLoggedIn={!!user} />
        </div>

        {/* Quick facts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2.5rem', padding: '1.25rem', background: 'var(--color-paper-darker)', borderRadius: '0.5rem' }}>
          {FACT_FIELDS.map(([key, label]) => item[key] ? (
            <div key={key as string}>
              <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', margin: '0 0 0.25rem' }}>{label}</p>
              <p className="text-body-sm" style={{ fontWeight: 600, color: 'var(--color-ink-deep)', margin: 0 }}>{String(item[key])}</p>
            </div>
          ) : null)}
        </div>

        {item.description && <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', marginBottom: '2.5rem' }}>{item.description}</p>}

        {NARRATIVE_FIELDS.map(([key, label]) => item[key] ? (
          <section key={key as string} style={{ marginBottom: '2rem' }}>
            <h2 className="text-headline-sm" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>{label}</h2>
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{String(item[key])}</p>
          </section>
        ) : null)}

        {item.jt_analysis && (
          <section style={{ margin: '2.5rem 0', padding: '1.5rem', background: 'var(--color-paper-darker)', borderRadius: '0.5rem' }}>
            <p className="text-label-sm" style={{ color: 'var(--color-accent-warm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>JT&apos;s Analysis</p>
            <p className="text-body-md" style={{ color: 'var(--color-ink-deep)', lineHeight: 1.75 }}>{item.jt_analysis}</p>
          </section>
        )}

        {item.what_i_would_do_differently && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 className="text-headline-sm" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>What I Would Do Differently</h2>
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{item.what_i_would_do_differently}</p>
          </section>
        )}

        {item.key_lessons?.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 className="text-headline-sm" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.75rem' }}>Key Lessons</h2>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
              {item.key_lessons.map((l, i) => <li key={i} className="text-body-md">{l}</li>)}
            </ol>
          </section>
        )}

        {item.discussion_questions?.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 className="text-headline-sm" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.75rem' }}>Discussion Questions</h2>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
              {item.discussion_questions.map((q, i) => <li key={i} className="text-body-md">{q}</li>)}
            </ul>
          </section>
        )}

        {item.sources?.length > 0 && (
          <section style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)' }}>
            <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Sources</p>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {item.sources.map((s, i) => (
                <li key={i} className="text-body-sm">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-ink-deep)' }}>{s.label}</a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
