import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@pshq/api-client/server'
import { awardContribution, normalizeCommentText, isLikelySpamComment, THOUGHTFUL_COMMENT_MIN_LENGTH } from '@pshq/api-client/community'
import { trackContributionScored, trackCommentPosted } from '@pshq/analytics'
import { getAuthedRequestUser } from '@/lib/api-auth'

interface Params { params: Promise<{ contentId: string }> }

// GET: chronological comment list (mobile has no other way to read
// comments — web reads them server-side directly in the article page).
export async function GET(req: NextRequest, { params }: Params) {
  const { contentId } = await params
  const service = createServiceClient()
  const { data, error } = await service
    .from('content_comments')
    .select('id, body, is_deleted, created_at, user:users!content_comments_user_id_fkey(full_name, email)')
    .eq('content_id', contentId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments: data ?? [] })
}

// POST: mobile's comment/rating UI (Epic F §F.1 mobile parity) — same
// logic as postCommentAction (web server action): length floor, §F.3
// near-duplicate spam block, service-client insert (the sync_comment_count
// trigger needs it, same reason documented in the web action), then
// score via the shared award path. One implementation of the actual
// rules, reached by two different transports.
export async function POST(req: NextRequest, { params }: Params) {
  const { contentId } = await params
  const auth = await getAuthedRequestUser(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const { body: rawBody } = await req.json().catch(() => ({ body: '' }))
  const body = (rawBody ?? '').trim()
  if (!body || body.length < 2) return NextResponse.json({ error: 'Comment is too short.' }, { status: 400 })
  if (body.length > 2000) return NextResponse.json({ error: 'Comment is too long (max 2000 chars).' }, { status: 400 })

  const normalized = normalizeCommentText(body)
  const { data: recentOwn } = await supabase
    .from('content_comments')
    .select('body')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)
  if ((recentOwn ?? []).some(c => normalizeCommentText(c.body) === normalized)) {
    return NextResponse.json({ error: 'You already posted something very similar recently.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service.from('content_comments').insert({ content_id: contentId, user_id: user.id, body, is_flagged: isLikelySpamComment(body) })
  if (error) return NextResponse.json({ error: 'Failed to post comment. Try again.' }, { status: 500 })

  if (body.length >= THOUGHTFUL_COMMENT_MIN_LENGTH) {
    const scored = await awardContribution(supabase, 'thoughtful_comment', contentId, normalized)
    if (scored) await trackContributionScored({ supabase, source: 'mobile', userId: user.id }, 'thoughtful_comment', 4, contentId)
  }

  await trackCommentPosted({ supabase, source: 'mobile', userId: user.id }, { contentId })

  return NextResponse.json({ success: true })
}
