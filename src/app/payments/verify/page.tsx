import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface Props { searchParams: Promise<{ reference?: string }> }

export default async function PaymentVerifyPage({ searchParams }: Props) {
  const { reference } = await searchParams
  if (!reference) redirect('/library')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // Look up the purchase by reference
  const { data: rawPurchase } = await supabase
    .from('purchases')
    .select('status, item_id, item_type, amount, currency')
    .eq('paystack_reference', reference)
    .eq('user_id', user.id)
    .single()

  const purchase = rawPurchase as Record<string, unknown> | null

  if (!purchase) {
    return (
      <div style={pageStyle}>
        <h1 style={h1}>Payment not found</h1>
        <p style={p}>We couldn't find a payment with that reference. <Link href="/library" style={link}>Browse library</Link></p>
      </div>
    )
  }

  if (purchase.status === 'success') {
    const contentId = purchase.item_id as string | null

    // Fetch content slug to link them
    let contentSlug: string | null = null
    if (contentId) {
      const { data: c } = await supabase.from('content').select('slug, type').eq('id', contentId).single()
      if (c) contentSlug = c.slug
    }

    const priceFormatted = purchase.currency === 'NGN'
      ? `₦${((purchase.amount as number) / 100).toLocaleString()}`
      : `${purchase.currency} ${((purchase.amount as number) / 100).toLocaleString()}`

    return (
      <div style={pageStyle}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h1 style={h1}>Payment successful</h1>
        <p style={p}>You paid <strong>{priceFormatted}</strong>. The resource is now in your library.</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          {contentSlug && (
            <Link href={`/content/${contentSlug}`} style={{ ...linkBtn, background: '#111827', color: '#fff' }}>
              Access resource
            </Link>
          )}
          <Link href="/dashboard" style={{ ...linkBtn, border: '1px solid #d1d5db', color: '#374151' }}>
            Go to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
      <h1 style={h1}>Payment pending</h1>
      <p style={p}>Your payment is still processing. Check your dashboard in a moment.</p>
      <Link href="/dashboard" style={{ ...linkBtn, background: '#111827', color: '#fff' }}>
        Go to dashboard
      </Link>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  maxWidth: '480px', margin: '4rem auto', padding: '2rem 1.5rem',
  textAlign: 'center', fontFamily: 'system-ui, sans-serif',
}
const h1: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: '0 0 0.75rem' }
const p: React.CSSProperties  = { color: '#6b7280', lineHeight: 1.6, margin: 0 }
const link: React.CSSProperties = { color: '#6366f1' }
const linkBtn: React.CSSProperties = {
  padding: '0.5rem 1.25rem', borderRadius: '8px', textDecoration: 'none',
  fontSize: '0.9375rem', fontWeight: 500, display: 'inline-block',
}
