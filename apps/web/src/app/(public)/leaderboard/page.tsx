import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@pshq/api-client/server'
import { trackLeaderboardViewed } from '@pshq/analytics'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

const PERIODS = ['weekly', 'monthly', 'all_time'] as const
type Period = typeof PERIODS[number]
const PERIOD_LABELS: Record<Period, string> = { weekly: 'This Week', monthly: 'This Month', all_time: 'All Time' }

interface LeaderboardRow {
  rank: number
  user_id: string
  display_name: string
  avatar_url: string | null
  score: number
  is_self: boolean
}

// Epic F §F.1/§F.4 — one aggregate leaderboard, three time views, per the
// PRD's initial-release guidance. Category leaderboards (Top Learner/
// Contributor/Builder) can be added later as a different get_leaderboard-
// style query grouped by action category over contribution_events — no
// schema change needed, see the migration's own comment.
export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: periodParam } = await searchParams
  const period: Period = PERIODS.includes(periodParam as Period) ? (periodParam as Period) : 'all_time'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data } = await supabase.rpc('get_leaderboard', { p_period: period, p_limit: 50 })
  const rows = (data ?? []) as LeaderboardRow[]

  await trackLeaderboardViewed({ supabase, source: 'web', userId: user.id }, period)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/leaderboard" />

      <main style={{ flex: 1, maxWidth: '40rem', margin: '0 auto', width: '100%', padding: '4rem var(--spacing-margin-edge) 6rem' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.5rem' }}>Leaderboard</h1>
          <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
            Ranked by real contribution — completing content, learning paths, and helping other members. Never by pageviews.
          </p>
        </header>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)', paddingBottom: '0.875rem' }}>
          {PERIODS.map(p => (
            <Link key={p} href={`/leaderboard?period=${p}`} className="text-label-sm" style={{
              padding: '0.5rem 1rem', borderRadius: '0.375rem',
              background: period === p ? 'var(--color-ink-deep)' : 'transparent',
              color: period === p ? '#ffffff' : 'var(--color-text-muted)',
              textDecoration: 'none', fontWeight: 600, transition: 'all 150ms',
            }}>
              {PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--color-paper-darker)', borderRadius: '0.75rem', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)' }}>
            <p className="text-headline-md" style={{ color: 'var(--color-ink-deep)', margin: '0 0 0.75rem' }}>Nobody&apos;s ranked yet {PERIOD_LABELS[period].toLowerCase()}</p>
            <p className="text-body-md" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              Complete an article, finish a learning path module, or leave a thoughtful comment to start earning contribution points.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rows.map(row => (
              <div key={row.user_id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.875rem 1rem', borderRadius: '0.5rem',
                background: row.is_self ? 'color-mix(in srgb, var(--color-accent-warm) 12%, transparent)' : '#ffffff',
                border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 800,
                  color: row.rank === 1 ? 'var(--color-accent-warm)' : 'var(--color-text-muted)',
                  width: '2rem', flexShrink: 0,
                }}>
                  #{row.rank}
                </span>
                {row.avatar_url ? (
                  <img src={row.avatar_url} alt="" width={32} height={32} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-paper-darker)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--color-text-muted)', flexShrink: 0, fontSize: '0.8125rem' }}>
                    {row.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontWeight: 600, color: 'var(--color-ink-deep)', fontSize: '0.9375rem' }}>
                  {row.display_name}{row.is_self ? ' (you)' : ''}
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--color-ink-deep)', fontSize: '0.9375rem' }}>
                  {row.score} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
