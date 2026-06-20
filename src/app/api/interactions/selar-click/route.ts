import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { contentId } = await req.json() as { contentId?: string }
    if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

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
