import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { SelarButton } from '@/components/content/SelarButton'
import { ShareButton } from '@/components/content/ShareButton'
import { FavoriteButton } from '@/components/content/FavoriteButton'
import { UpvoteButton } from '@/components/article/UpvoteButton'
import { JsonLd } from '@/components/seo/JsonLd'
import { digitalDocumentSchema, breadcrumbSchema } from '@/lib/seo/schema'
import { AUTHOR, DEFAULT_OG_IMAGE, absoluteUrl } from '@/lib/seo/constants'
import { isViewableInline } from '@/lib/viewable'

interface Props { params: Promise<{ slug: string }> }

const TYPE_LABELS: Record<string, string> = {
  ebook: 'Ebook',
  template: 'Template',
  course: 'Course',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('content')
    .select('title, summary, cover_image_url, type')
    .eq('slug', slug)
    .eq('status', 'published')
    .not('type', 'eq', 'article')
    .single()

  if (!data) return {}

  const suffix = data.type === 'ebook' ? ' — Free Download' : ''
  const title = `${data.title}${suffix}`
  const description = data.summary ?? undefined
  const image = data.cover_image_url ?? DEFAULT_OG_IMAGE

  return {
    title,
    description,
    alternates: { canonical: `/content/${slug}` },
    openGraph: { type: 'article', title, description, url: `/content/${slug}`, images: [{ url: image }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function ContentDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: rawItem, error } = await supabase
    .from('content')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .not('type', 'eq', 'article')
    .single()

  if (error || !rawItem) notFound()

  const item = rawItem as Record<string, unknown>
  const pricingType = item.pricing_type as string ?? 'free'
  const selarUrl = item.selar_url as string | null
  const fileUrl = item.file_url as string | null
  // Read is offered only where /api/view can actually render something —
  // PDFs natively, spreadsheets as a rendered HTML table. Everything else
  // still gets Download + Share.
  const isReadable = isViewableInline(fileUrl)

  const { data: { user } } = await supabase.auth.getUser()

  // Record view (non-fatal)
  try {
    const service = createServiceClient()
    await service.from('content_interactions').insert({
      content_id: rawItem.id,
      user_id: user?.id ?? null,
      type: 'view',
      metadata: {},
    })
  } catch { /* non-fatal */ }

  const { data: upvoteRow } = user
    ? await supabase
        .from('content_upvotes')
        .select('id')
        .eq('content_id', rawItem.id)
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }
  const hasUpvoted = !!upvoteRow

  const { data: favoriteRow } = user
    ? await supabase
        .from('content_favorites')
        .select('id')
        .eq('content_id', rawItem.id)
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }
  const hasFavorited = !!favoriteRow

  // Free content: any signed-in user has access
  const hasAccess = user != null && pricingType === 'free'

  const label = TYPE_LABELS[rawItem.type as string] ?? rawItem.type as string
  const publishedDate = rawItem.published_at
    ? new Date(rawItem.published_at as string).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-paper-base)' }}>
      <JsonLd data={digitalDocumentSchema({
        name: rawItem.title as string,
        description: rawItem.summary as string | null,
        image: rawItem.cover_image_url as string | null,
        path: `/content/${slug}`,
        datePublished: rawItem.published_at as string | null,
      })} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Library', path: '/library' },
        { name: rawItem.title as string, path: `/content/${slug}` },
      ])} />
      <nav style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'color-mix(in srgb, var(--color-paper-base) 92%, transparent)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
        padding: '0.875rem var(--spacing-margin-edge)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/library" className="text-label-sm" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
          ← Library
        </Link>
        <Link href="/" className="text-label-sm" style={{ color: 'var(--color-ink-deep)', fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--font-serif)' }}>
          Product Slice HQ
        </Link>
      </nav>

      <main style={{ maxWidth: '64rem', margin: '0 auto', padding: '3rem var(--spacing-margin-edge) 6rem' }}>
        <div className="content-detail-grid" style={{ display: 'grid', gap: '3rem', alignItems: 'start' }}>

          {/* Left — content info */}
          <div>
            {rawItem.cover_image_url && (
              <img
                src={rawItem.cover_image_url as string}
                alt={rawItem.title as string}
                width={1200}
                height={240}
                style={{ width: '100%', borderRadius: '0.25rem', marginBottom: '1.5rem', height: '240px', objectFit: 'cover' }}
              />
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span className="badge" style={{
                background: 'color-mix(in srgb, var(--color-ink-deep) 10%, transparent)',
                color: 'var(--color-ink-deep)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {label}
              </span>
              {pricingType === 'free' ? (
                <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>Free</span>
              ) : (
                <span className="badge" style={{ background: 'color-mix(in srgb, var(--color-accent-warm) 25%, transparent)', color: 'oklch(45% 0.12 85)' }}>
                  Available on Selar
                </span>
              )}
            </div>

            <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', margin: '0 0 1rem' }}>
              {rawItem.title as string}
            </h1>

            {rawItem.summary && (
              <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, margin: '0 0 1.25rem' }}>
                {rawItem.summary as string}
              </p>
            )}

            {/* Byline and upvote sit directly under the summary in a bordered
                row, matching the article template. They previously rendered
                below the tags as the last element on the page, which put the
                upvote under the fold with nothing separating it — it read as
                missing entirely. */}
            <div className="text-label-sm" style={{
              display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
              color: 'var(--color-text-muted)',
              padding: '0.875rem 0',
              margin: '0 0 1rem',
              borderTop: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
              borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
            }}>
              <span>By {AUTHOR.name}</span>
              {publishedDate && <span>Published {publishedDate}</span>}
              <UpvoteButton
                contentId={rawItem.id as string}
                initialCount={item.upvote_count as number ?? 0}
                initialUpvoted={hasUpvoted}
                isLoggedIn={!!user}
              />
              <FavoriteButton
                contentId={rawItem.id as string}
                initialFavorited={hasFavorited}
                isLoggedIn={!!user}
              />
            </div>

            {rawItem.tags && Array.isArray(rawItem.tags) && (rawItem.tags as string[]).length > 0 && (
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {(rawItem.tags as string[]).map(tag => (
                  <span key={tag} className="text-label-sm" style={{
                    background: 'var(--color-paper-darker)',
                    color: 'var(--color-text-muted)',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '0.125rem',
                    border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right — CTA card. Sticky only applies at the desktop breakpoint
              (see .content-detail-cta in globals.css) — once the grid
              collapses to one column on mobile this sits below the content
              as a normal block instead of sticking mid-scroll. */}
          <div className="content-detail-cta" style={{
            background: '#ffffff',
            border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
            borderRadius: '0.5rem',
            padding: '1.5rem',
          }}>
            {pricingType === 'paid' ? (
              /* Paid — link out to Selar, no unlock state */
              <>
                <p className="text-label-sm" style={{
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  margin: '0 0 0.5rem',
                }}>
                  Available on Selar
                </p>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', margin: '0 0 1.25rem', lineHeight: 1.65 }}>
                  This resource is hosted and sold on Selar. You&apos;ll complete your purchase there and receive access directly.
                </p>
                {selarUrl ? (
                  <SelarButton
                    contentId={rawItem.id as string}
                    selarUrl={selarUrl}
                    label={label}
                  />
                ) : (
                  <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    Selar link coming soon.
                  </p>
                )}
                <p className="text-label-sm" style={{ color: 'var(--color-text-muted)', textAlign: 'center', margin: '0.875rem 0 0' }}>
                  Secure checkout on Selar
                </p>
              </>
            ) : hasAccess && fileUrl ? (
              /* Free + signed in + file available — read in-platform is the
                 default action; download and share are secondary. This
                 used to be a single "Download" link that, depending on the
                 browser, sometimes opened inline anyway and sometimes saved
                 a file — there was no real way to just read without an
                 unpredictable side effect. */
              <>
                <p className="text-label-sm" style={{ color: '#15803d', fontWeight: 700, margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  ✓ Free to access
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {isReadable && (
                    <Link
                      href={`/content/${slug}/read`}
                      className="btn-primary"
                      style={{ display: 'block', textAlign: 'center' }}
                    >
                      Read {label}
                    </Link>
                  )}
                  <a
                    href={`/api/download/${rawItem.id}`}
                    className={isReadable ? 'btn-outline' : 'btn-primary'}
                    style={{ display: 'block', textAlign: 'center' }}
                  >
                    Download
                  </a>
                  <ShareButton
                    contentId={rawItem.id as string}
                    title={rawItem.title as string}
                    url={absoluteUrl(`/content/${slug}`)}
                  />
                </div>
              </>
            ) : hasAccess && !fileUrl ? (
              /* Free + signed in, no file yet */
              <p className="text-body-sm" style={{ color: '#15803d', fontWeight: 600, margin: 0 }}>
                Free resource — download link coming soon.
              </p>
            ) : (
              /* Not signed in */
              <>
                <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', margin: '0 0 1.25rem', lineHeight: 1.65 }}>
                  Sign in to access this free {label.toLowerCase()}.
                </p>
                <Link href={`/sign-in?redirect=/content/${slug}`} className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>
                  Sign in to access
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

