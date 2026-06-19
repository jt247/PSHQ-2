import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { UserRow } from '@/types/database'
import { PurchaseButton } from '@/components/content/PurchaseButton'

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
  const priceAmount = item.price_amount as number | null
  const currency = item.currency as string ?? 'NGN'
  const fileUrl = item.file_url as string | null

  // get current user
  const { data: { user } } = await supabase.auth.getUser()

  let userProfile: UserRow | null = null
  if (user) {
    const { data: profileRaw } = await supabase.from('users').select('*').eq('id', user.id).single()
    userProfile = profileRaw as UserRow | null
  }

  // record view
  try {
    const service = createServiceClient()
    await service.from('content_interactions').insert({
      content_id: rawItem.id,
      user_id: user?.id ?? null,
      interaction_type: 'view',
      metadata: {},
    })
  } catch {
    // non-fatal
  }

  // check if user has unlocked this content
  let hasUnlocked = false
  if (user && pricingType === 'free') {
    hasUnlocked = true
  } else if (user && pricingType === 'paid') {
    const { data: interaction } = await supabase
      .from('content_interactions')
      .select('id')
      .eq('content_id', rawItem.id)
      .eq('user_id', user.id)
      .in('interaction_type', ['unlock', 'purchase'])
      .limit(1)
      .single()
    hasUnlocked = !!interaction
  }

  const label = TYPE_LABELS[rawItem.type as string] ?? rawItem.type as string
  const publishedDate = rawItem.published_at
    ? new Date(rawItem.published_at as string).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })
    : null
  const priceFormatted = priceAmount
    ? `${currency === 'NGN' ? '₦' : currency + ' '}${(priceAmount / 100).toLocaleString()}`
    : null

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <nav style={{ marginBottom: '1.5rem' }}>
        <Link href="/library" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← Back to library
        </Link>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'start' }}>
        <div>
          {rawItem.cover_image_url && (
            <img
              src={rawItem.cover_image_url as string}
              alt={rawItem.title as string}
              style={{ width: '100%', borderRadius: '10px', marginBottom: '1.5rem', maxHeight: '320px', objectFit: 'cover' }}
            />
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{
              background: '#ede9fe', color: '#6d28d9',
              fontSize: '0.75rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px',
            }}>
              {label}
            </span>
            {pricingType === 'free' ? (
              <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>
                Free
              </span>
            ) : (
              <span style={{ background: '#fef9c3', color: '#a16207', fontSize: '0.75rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>
                {priceFormatted}
              </span>
            )}
          </div>

          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, lineHeight: 1.3, color: '#111827', margin: '0 0 0.75rem' }}>
            {rawItem.title as string}
          </h1>

          {rawItem.summary && (
            <p style={{ fontSize: '1.0625rem', color: '#6b7280', lineHeight: 1.6, margin: '0 0 1rem' }}>
              {rawItem.summary as string}
            </p>
          )}

          {rawItem.tags && Array.isArray(rawItem.tags) && (rawItem.tags as string[]).length > 0 && (
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {(rawItem.tags as string[]).map(tag => (
                <span key={tag} style={{ background: '#f3f4f6', color: '#6b7280', fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '4px' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {publishedDate && (
            <p style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>Published {publishedDate}</p>
          )}
        </div>

        {/* CTA card */}
        <div style={{
          minWidth: '240px', background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: '12px', padding: '1.5rem', position: 'sticky', top: '1rem',
        }}>
          {hasUnlocked && fileUrl ? (
            <>
              <p style={{ fontSize: '0.875rem', color: '#15803d', fontWeight: 600, margin: '0 0 1rem' }}>
                You have access
              </p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'block', width: '100%', textAlign: 'center',
                  background: '#111827', color: '#fff', borderRadius: '8px',
                  padding: '0.625rem 1rem', fontWeight: 600, textDecoration: 'none',
                  fontSize: '0.9375rem',
                }}
              >
                Download {label}
              </a>
            </>
          ) : !user ? (
            <>
              <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0 0 1rem' }}>
                {pricingType === 'free'
                  ? 'Sign in to access this free resource.'
                  : `Sign in to purchase this ${label.toLowerCase()} for ${priceFormatted}.`}
              </p>
              <Link
                href={`/sign-in?redirect=/content/${slug}`}
                style={{
                  display: 'block', textAlign: 'center',
                  background: '#111827', color: '#fff', borderRadius: '8px',
                  padding: '0.625rem 1rem', fontWeight: 600, textDecoration: 'none', fontSize: '0.9375rem',
                }}
              >
                Sign in to access
              </Link>
            </>
          ) : pricingType === 'paid' ? (
            <>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 0.25rem' }}>
                {priceFormatted}
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 1rem' }}>
                One-time purchase
              </p>
              <PurchaseButton contentId={rawItem.id as string} priceFormatted={priceFormatted ?? ''} />
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', margin: '0.75rem 0 0' }}>
                Secure payment via Paystack
              </p>
            </>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Something went wrong. Please refresh.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
