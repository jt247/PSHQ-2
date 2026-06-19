import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/notifications/mark-read
// Body: { notificationId?: string } — omit to mark all read
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { notificationId } = await req.json() as { notificationId?: string }

  let query = supabase
    .from('notification_recipients')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)

  if (notificationId) {
    query = query.eq('notification_id', notificationId)
  }

  await query
  return NextResponse.json({ ok: true })
}
