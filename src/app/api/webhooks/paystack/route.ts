import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

// Paystack signs the request body with your secret key using HMAC-SHA512.
function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY ?? ''
  const hash = createHmac('sha512', secret).update(body).digest('hex')
  return hash === signature
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-paystack-signature') ?? ''

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { event: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true })
  }

  const reference = event.data.reference as string
  const status    = (event.data.status as string) === 'success' ? 'success' : 'failed'

  const service = createServiceClient()

  // Find the purchase record
  const { data: purchase } = await service
    .from('purchases')
    .select('id, user_id, item_id, item_type')
    .eq('paystack_reference', reference)
    .single()

  if (!purchase) return NextResponse.json({ received: true })

  // Update purchase status
  await service
    .from('purchases')
    .update({ status, metadata: event.data as never })
    .eq('id', purchase.id)

  // On success: unlock content for the user
  if (status === 'success' && purchase.item_type === 'content' && purchase.item_id) {
    await service.from('content_interactions').insert({
      content_id: purchase.item_id,
      user_id: purchase.user_id,
      type: 'purchase',
      metadata: { purchase_id: purchase.id, reference },
    } as never).then(() => null, () => null)
  }

  return NextResponse.json({ received: true })
}
