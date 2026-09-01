import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getAuthedRequestUser } from '@/lib/api-auth'
import { createCustomLearningPath, getMonthlyLearningPathCount, MonthlyLimitError, type LearningPathIntake } from '@/lib/ai/learning-path'
import { trackAiLearningPathCreated } from '@pshq/analytics'
import { rateLimit } from '@/lib/ratelimit'

// GET: monthly cap status, so the UI can show the "you've used all 3 this
// month" notice before the member even starts the intake flow.
export async function GET(req: NextRequest) {
  const auth = await getAuthedRequestUser(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const used = await getMonthlyLearningPathCount(auth.supabase, auth.user.id)
  return NextResponse.json({ used, limit: 3, remaining: Math.max(0, 3 - used) })
}

export async function POST(req: NextRequest) {
  const auth = await getAuthedRequestUser(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  // Belt-and-suspenders alongside the monthly count check inside
  // createCustomLearningPath — this catches rapid-fire double submits.
  const allowed = await rateLimit('ai-learning-path', user.id, 3, 60)
  if (!allowed) return NextResponse.json({ error: 'Please wait a moment before trying again.' }, { status: 429 })

  let intake: LearningPathIntake
  try {
    intake = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!intake.goalText?.trim()) {
    return NextResponse.json({ error: 'Tell us what you’re trying to achieve.' }, { status: 400 })
  }

  try {
    const result = await createCustomLearningPath(supabase, user.id, intake)
    if (!result.insufficientContent) {
      await trackAiLearningPathCreated({ supabase, source: req.headers.get('x-app-source') === 'mobile' ? 'mobile' : 'web', userId: user.id }, { contentId: result.learningPathId })
    }
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof MonthlyLimitError) {
      return NextResponse.json({ error: err.message, monthlyLimitReached: true }, { status: 429 })
    }
    const status = (err as Error & { status?: number }).status
    if (status === 429) return NextResponse.json({ error: 'AI quota reached. Try again in a minute.' }, { status: 429 })
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Failed to create your learning path. Try again.' }, { status: 502 })
  }
}
