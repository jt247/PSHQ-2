import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { rateLimit, clientIp } from '@/lib/ratelimit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  try {
    const { contentId } = await req.json() as { contentId?: string }
    if (!contentId || !UUID_RE.test(contentId)) {
      return NextResponse.json({ error: 'contentId required' }, { status: 400 })
    }

    // Cap anonymous click tracking: 10 per IP per minute.
    const allowed = await rateLimit('selar-click', clientIp(req.headers), 10, 60)
    if (!allowed) return NextResponse.json({ ok: true }) // silently drop

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Only log clicks for content that actually exists and is published.
    const { data: content } = await supabase
      .from('content')
      .select('id')
      .eq('id', contentId)
      .eq('status', 'published')
      .single()
    if (!content) return NextResponse.json({ ok: true })

    const service = createServiceClient()
    await service.from('content_interactions').insert({
      content_id: contentId,
      user_id: user?.id ?? null,
      type: 'selar_click',
      metadata: {},
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Never let tracking errors surface to the client
    return NextResponse.json({ ok: true })
  }
}
