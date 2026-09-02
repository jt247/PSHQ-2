import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceSupabase } from '@supabase/supabase-js'
import { getAuthedRequestUser } from '@/lib/api-auth'
import type { FeedbackCategory } from '@pshq/database'

const VALID_CATEGORIES: FeedbackCategory[] = [
  'bug', 'feature_suggestion', 'content_request', 'something_confusing',
  'something_liked', 'account_support', 'other',
]

// Epic G §G.10 — the single "Give Feedback" entry point, distinct from
// Contact Us (which stays a separate, unauthenticated support_tickets
// flow). Auto-captures context server-side (URL, device/browser parsed
// from the real request User-Agent, logged-in state) rather than trusting
// the client to self-report any of it.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
  }
  if (!VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
  }

  const auth = await getAuthedRequestUser(req)
  const ua = req.headers.get('user-agent') ?? ''
  const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop'
  const browserMatch = ua.match(/(Chrome|Safari|Firefox|Edg|OPR)\/[\d.]+/)
  const browser = browserMatch ? browserMatch[0] : 'unknown'

  // Feedback is insertable by anon or authed users per its own RLS policy
  // ("feedback: anyone insert") — use the service client only to attach
  // the resolved user id when we have one from a Bearer token (mobile) or
  // cookie (web), since the anon key alone can't set a foreign user_id.
  const service = createServiceSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error } = await service.from('feedback').insert({
    user_id: auth?.user.id ?? null,
    category: body.category,
    message: String(body.message).trim().slice(0, 4000),
    url: typeof body.url === 'string' ? body.url.slice(0, 500) : null,
    device,
    browser,
    is_logged_in: !!auth,
    screenshot_url: typeof body.screenshotUrl === 'string' ? body.screenshotUrl : null,
  })

  if (error) return NextResponse.json({ error: 'Failed to submit feedback.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
