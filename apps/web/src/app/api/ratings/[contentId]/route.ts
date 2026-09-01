import { NextRequest, NextResponse } from 'next/server'
import { awardContribution } from '@pshq/api-client/community'
import { trackContributionScored } from '@pshq/analytics'
import { getAuthedRequestUser } from '@/lib/api-auth'

interface Params { params: Promise<{ contentId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { contentId } = await params
  const auth = await getAuthedRequestUser(req)
  if (!auth) return NextResponse.json({ rating: null })
  const { data } = await auth.supabase.from('ratings').select('rating, review_text').eq('content_id', contentId).eq('user_id', auth.user.id).maybeSingle()
  return NextResponse.json({ rating: data?.rating ?? null, reviewText: data?.review_text ?? null })
}

// Mobile parity for submitRatingAction — same upsert + scoring rule.
export async function POST(req: NextRequest, { params }: Params) {
  const { contentId } = await params
  const auth = await getAuthedRequestUser(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const { rating, reviewText } = await req.json().catch(() => ({ rating: 0, reviewText: null }))
  const parsed = parseInt(String(rating), 10)
  if (parsed < 1 || parsed > 5) return NextResponse.json({ error: 'Select a rating from 1-5.' }, { status: 400 })

  const { error } = await supabase.from('ratings').upsert(
    { content_id: contentId, user_id: user.id, rating: parsed, review_text: (reviewText ?? '').trim() || null },
    { onConflict: 'content_id,user_id' }
  )
  if (error) return NextResponse.json({ error: 'Failed to save rating. Try again.' }, { status: 500 })

  const scored = await awardContribution(supabase, 'rating', contentId, contentId)
  if (scored) await trackContributionScored({ supabase, source: 'mobile', userId: user.id }, 'rating', 1, contentId)

  return NextResponse.json({ success: true })
}
