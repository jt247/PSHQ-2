import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@pshq/api-client/server'

// Epic J §J.6 — one-click unsubscribe, no login required (standard for
// email digests). The per-recipient token itself is the credential, same
// pattern as a password-reset link; it is unique per digest_recipients
// row and cannot be guessed or reused to affect another recipient's row.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const service = createServiceClient()
  const { data: recipient } = await service
    .from('digest_recipients')
    .select('id, user_id, unsubscribed_at')
    .eq('unsubscribe_token', token)
    .maybeSingle()

  if (!recipient) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  const row = recipient as { id: string; user_id: string; unsubscribed_at: string | null }

  if (!row.unsubscribed_at) {
    await service.from('digest_recipients').update({ unsubscribed_at: new Date().toISOString() }).eq('id', row.id)
  }
  // Turns off every future digest send, not just this one issue.
  await service.from('notification_preferences').upsert(
    { user_id: row.user_id, key: 'weekly_digest_prompt', enabled: false },
    { onConflict: 'user_id,key' }
  )

  return new NextResponse(
    '<!doctype html><html><body style="font-family:sans-serif;max-width:480px;margin:4rem auto;text-align:center"><h2>You\'re unsubscribed</h2><p>You won\'t receive the ProductSlice Weekly digest anymore. You can re-enable it anytime from your notification preferences.</p></body></html>',
    { headers: { 'Content-Type': 'text/html' } }
  )
}
