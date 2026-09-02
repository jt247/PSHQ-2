import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@pshq/api-client/server'
import { sendPushToUsers } from '@pshq/api-client/push'
import { getAuthedRequestUser } from '@/lib/api-auth'

interface AchievementRow { key: string; title: string; icon: string | null }

// Epic I §I.6 — the one real automatic push trigger in this epic: fired
// right after checkAndAwardAchievements() detects a newly-earned
// achievement (mobile's Profile screen; web's dashboard could call the
// same route later instead of duplicating the send). Uses the shared
// sendPushToUsers so a device with no token, or a member who's disabled
// "new_achievement" pushes, is skipped the same way an admin broadcast
// would skip them — one implementation, not two.
export async function POST(req: NextRequest) {
  const auth = await getAuthedRequestUser(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth

  const { achievementKey } = await req.json().catch(() => ({ achievementKey: null }))
  if (!achievementKey || typeof achievementKey !== 'string') {
    return NextResponse.json({ error: 'achievementKey is required.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: achievement } = await service
    .from('achievements')
    .select('key, title, icon')
    .eq('key', achievementKey)
    .maybeSingle()
  const row = achievement as AchievementRow | null

  await sendPushToUsers(service, {
    userIds: [user.id],
    category: 'new_achievement',
    title: 'Achievement unlocked 🎉',
    body: row ? `${row.icon ?? ''} ${row.title}`.trim() : 'You earned a new achievement.',
    data: { achievementKey },
  })

  return NextResponse.json({ success: true })
}
