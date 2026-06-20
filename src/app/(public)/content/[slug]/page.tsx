import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { SelarButton } from '@/components/content/SelarButton'

interface Props { params: Promise<{ slug: string }> }

const TYPE_LABELS: Record<string, string> = {
  ebook: 'Ebook',
  template: 'Template',
  course: 'Course',
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

  // Free content: any signed-in user has access
  const hasAccess = user != null && pricingType === 'free'

  const label = TYPE_LABELS[rawItem.type as string] ?? rawItem.type as string
  const publishedDate = rawItem.published_at
    ? new Date(rawItem.published_at as string).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-paper-base)' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '3rem', alignItems: 'start' }}>

          {/* Left — content info */}
          <div>
            {rawItem.cover_image_url && (
              <img
                src={rawItem.cover_image_url as string}
                alt={rawItem.title as string}
                style={{ width: '100%', borderRadius: '0.25rem', marginBottom: '2rem', maxHeight: '320px', objectFit: 'cover' }}
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

            {publishedDate && (
              <p className="text-label-sm" style={{ color: 'var(--color-text-muted)' }}>Published {publishedDate}</p>
            )}
          </div>

          {/* Right — CTA card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            position: 'sticky',
            top: '5rem',
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
              /* Free + signed in + file available */
              <>
                <p className="text-label-sm" style={{ color: '#15803d', fontWeight: 700, margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  ✓ Free to access
                </p>
                <a
                  href={`/api/download/${rawItem.id}`}
                  className="btn-primary"
                  style={{ display: 'block', textAlign: 'center' }}
                >
                  Download {label}
                </a>
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

