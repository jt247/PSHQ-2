import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paystack } from '@/lib/paystack/client'
import type { UserRow } from '@/types/database'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contentId } = await req.json() as { contentId: string }
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 })

  // Fetch content to get price
  const { data: rawContent } = await supabase
    .from('content')
    .select('id, title, pricing_type, price_amount, currency')
    .eq('id', contentId)
    .eq('status', 'published')
    .single()

  const content = rawContent as Record<string, unknown> | null
  if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 })
  if (content.pricing_type !== 'paid') return NextResponse.json({ error: 'Content is free' }, { status: 400 })

  const priceAmount = content.price_amount as number
  if (!priceAmount) return NextResponse.json({ error: 'No price set' }, { status: 400 })

  // Get user profile for email
  const { data: profileRaw } = await supabase.from('users').select('email').eq('id', user.id).single()
  const profile = profileRaw as { email: string } | null
  const email = profile?.email ?? user.email ?? ''

  // Create pending purchase record
  const reference = `pshq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const { data: purchase, error: pErr } = await supabase
    .from('purchases')
    .insert({
      user_id: user.id,
      amount: priceAmount,
      currency: (content.currency as string) ?? 'NGN',
      status: 'pending',
      paystack_reference: reference,
      item_type: 'content',
      item_id: contentId,
      metadata: { content_title: content.title },
    })
    .select('id')
    .single()

  if (pErr || !purchase) return NextResponse.json({ error: 'Failed to create purchase' }, { status: 500 })

  // Initialize Paystack transaction
  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/payments/verify?reference=${reference}`

  try {
    const result = await paystack.initializeTransaction({
      email,
      amount: priceAmount,
      reference,
      metadata: {
        purchase_id: purchase.id,
        content_id: contentId,
        user_id: user.id,
      },
    })

    // Save access_code
    await supabase
      .from('purchases')
      .update({ paystack_access_code: result.data.access_code })
      .eq('id', purchase.id)

    return NextResponse.json({ authorization_url: result.data.authorization_url })
  } catch (err) {
    return NextResponse.json({ error: 'Payment initialization failed' }, { status: 502 })
  }
}
