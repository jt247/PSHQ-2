import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createServiceClient } from '@pshq/api-client/server'
import { trackDigestOpened, trackDigestClicked } from '@pshq/analytics'

// Epic J §J.6 — real per-recipient opened/clicked tracking for the Weekly
// Digest. Resend signs every webhook with the same Svix format its docs
// recommend verifying (never trust an unsigned POST claiming to be
// Resend). RESEND_WEBHOOK_SECRET comes from the Resend dashboard's
// webhook setup — until that's configured, this route safely 401s rather
// than accepting unverified events.
interface ResendWebhookEvent {
  type: string
  data: { email_id?: string }
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 501 })

  const body = await req.text()
  const svixHeaders = {
    'svix-id': req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  }

  let event: ResendWebhookEvent
  try {
    event = new Webhook(secret).verify(body, svixHeaders) as unknown as ResendWebhookEvent
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const emailId = event.data?.email_id
  if (!emailId) return NextResponse.json({ received: true })

  const service = createServiceClient()
  const { data: recipient } = await service
    .from('digest_recipients')
    .select('id, user_id, opened_at, clicked_at')
    .eq('resend_email_id', emailId)
    .maybeSingle()

  // Not every Resend email is a digest send (transactional emails use the
  // same account) — a miss here is expected and not an error.
  if (!recipient) return NextResponse.json({ received: true })
  const digestRecipient = recipient as { id: string; user_id: string; opened_at: string | null; clicked_at: string | null }

  if (event.type === 'email.opened' && !digestRecipient.opened_at) {
    await service.from('digest_recipients').update({ opened_at: new Date().toISOString() }).eq('id', digestRecipient.id)
    await trackDigestOpened({ supabase: service, source: 'web', userId: digestRecipient.user_id }, digestRecipient.id)
  }

  if (event.type === 'email.clicked' && !digestRecipient.clicked_at) {
    await service.from('digest_recipients').update({ clicked_at: new Date().toISOString() }).eq('id', digestRecipient.id)
    await trackDigestClicked({ supabase: service, source: 'web', userId: digestRecipient.user_id }, digestRecipient.id, 'digest_body')
  }

  return NextResponse.json({ received: true })
}
