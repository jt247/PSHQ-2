import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { generateText, AI_MODEL_NAME } from '@/lib/ai/client'
import { rateLimit } from '@/lib/ratelimit'

interface Params { params: Promise<{ contentId: string }> }

// GET: return cached summary if available
export async function GET(_req: NextRequest, { params }: Params) {
  const { contentId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('ai_summaries')
    .select('summary_text, bullet_points, key_concepts, created_at')
    .eq('content_id', contentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return NextResponse.json({ cached: false })

  return NextResponse.json({
    cached: true,
    summary: data.summary_text,
    bullets: (data.bullet_points as unknown as string[]) ?? [],
    concepts: (data.key_concepts as unknown as string[]) ?? [],
  })
}

// POST: generate summary via Gemini, cache, return
export async function POST(_req: NextRequest, { params }: Params) {
  const { contentId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit paid Gemini generations: 5 per user per 5 minutes.
  // Cached summaries are served by the check below and stay free.
  const allowed = await rateLimit('ai-summary', user.id, 5, 300)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many summary requests. Try again in a few minutes.' },
      { status: 429 }
    )
  }

  // Fetch the article
  const { data: content, error } = await supabase
    .from('content')
    .select('id, title, body, type, status')
    .eq('id', contentId)
    .eq('status', 'published')
    .single()

  if (error || !content || !content.body) {
    return NextResponse.json({ error: 'Content not found or has no body' }, { status: 404 })
  }

  // Return cached if exists (race-condition guard)
  const { data: existing } = await supabase
    .from('ai_summaries')
    .select('summary_text, bullet_points, key_concepts')
    .eq('content_id', contentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    return NextResponse.json({
      cached: true,
      summary: existing.summary_text,
      bullets: (existing.bullet_points as unknown as string[]) ?? [],
      concepts: (existing.key_concepts as unknown as string[]) ?? [],
    })
  }

  const prompt = `You are an expert product management educator. Summarise the following article for a product manager audience.

Title: ${content.title}

Body:
${content.body.slice(0, 8000)}

Respond with ONLY valid JSON in this exact shape — no markdown fences, no extra text:
{
  "summary": "2-3 sentence plain-English summary",
  "bullets": ["key point 1", "key point 2", "key point 3", "key point 4", "key point 5"],
  "concepts": ["concept 1", "concept 2", "concept 3"]
}`

  let parsed: { summary: string; bullets: string[]; concepts: string[] }
  try {
    const text = await generateText(prompt)
    const jsonText = text.startsWith('{') ? text : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
    parsed = JSON.parse(jsonText)
  } catch (err) {
    const status = (err as Error & { status?: number }).status
    if (status === 429) {
      return NextResponse.json(
        { error: 'AI quota reached. Try again in a minute.' },
        { status: 429 }
      )
    }
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Failed to generate summary. Try again.' }, { status: 502 })
  }

  // Save to cache
  const service = createServiceClient()
  await service.from('ai_summaries').insert({
    content_id: contentId,
    summary_text: parsed.summary,
    bullet_points: parsed.bullets as unknown as never,
    key_concepts: parsed.concepts as unknown as never,
    model_used: AI_MODEL_NAME,
    requested_by: user.id,
  })

  // Track interaction
  await service.from('content_interactions').insert({
    content_id: contentId,
    user_id: user.id,
    type: 'ai_summary_requested',
    metadata: {},
  } as never)

  return NextResponse.json({
    cached: false,
    summary: parsed.summary,
    bullets: parsed.bullets,
    concepts: parsed.concepts,
  })
}
