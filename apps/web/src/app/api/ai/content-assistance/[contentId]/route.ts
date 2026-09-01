import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getAuthedRequestUser } from '@/lib/api-auth'
import { getOrGenerateContentAssistance, InsufficientContentError } from '@/lib/ai/content-assistance'
import { rateLimit } from '@/lib/ratelimit'
import { trackContentAssistanceRequested } from '@pshq/analytics'
import type { ContentAssistanceAction } from '@pshq/api-client/ai'

interface Params { params: Promise<{ contentId: string }> }

const VALID_ACTIONS: ContentAssistanceAction[] = ['key_takeaways', 'action_checklist', 'reflection_questions']

// One route serves both web and mobile — getAuthedRequestUser accepts
// either a cookie session or a mobile Bearer token, same pattern every
// new Epic E route uses.
export async function POST(req: NextRequest, { params }: Params) {
  const { contentId } = await params
  const auth = await getAuthedRequestUser(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const action = req.nextUrl.searchParams.get('action') as ContentAssistanceAction | null
  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Invalid or missing action' }, { status: 400 })
  }

  const allowed = await rateLimit('ai-content-assistance', user.id, 15, 300)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again in a few minutes.' }, { status: 429 })
  }

  const { data: content, error } = await supabase
    .from('content')
    .select('id, title, body, updated_at, status')
    .eq('id', contentId)
    .eq('status', 'published')
    .single()

  if (error || !content) return NextResponse.json({ error: 'Content not found' }, { status: 404 })

  try {
    const result = await getOrGenerateContentAssistance(supabase, content, action, user.id)
    await trackContentAssistanceRequested({ supabase, source: req.headers.get('x-app-source') === 'mobile' ? 'mobile' : 'web', userId: user.id }, action, contentId)
    return NextResponse.json({ action, ...result })
  } catch (err) {
    if (err instanceof InsufficientContentError) {
      return NextResponse.json({ insufficientContent: true, message: err.message }, { status: 200 })
    }
    const status = (err as Error & { status?: number }).status
    if (status === 429) return NextResponse.json({ error: 'AI quota reached. Try again in a minute.' }, { status: 429 })
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Failed to generate. Try again.' }, { status: 502 })
  }
}
