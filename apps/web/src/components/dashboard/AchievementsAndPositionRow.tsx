import type { CommunityPosition } from '@pshq/api-client/dashboard'
import type { EarnedAchievement } from '@pshq/api-client/community'
import { SectionCard, EmptyState } from './DashboardPrimitives'

// Achievements (Epic F §F.4) — real unlock logic now lives behind this
// slot; the exact empty-state copy from Build Prompt 5 is preserved
// verbatim for a member with zero earned achievements, per the standing
// rule that this must not regress for a brand-new member.
function AchievementsCard({ achievements }: { achievements: EarnedAchievement[] }) {
  return (
    <SectionCard title="🏅 Achievements">
      {achievements.length === 0 ? (
        <EmptyState>Complete your first learning activity to earn an achievement.</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', padding: '0.875rem 0 1.25rem' }}>
          {achievements.map(a => (
            <div key={a.key} title={a.description} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem', borderRadius: '9999px',
              background: 'color-mix(in srgb, var(--color-accent-warm) 15%, transparent)',
            }}>
              <span style={{ fontSize: '1.125rem' }}>{a.icon}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-ink-deep)' }}>{a.title}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// Community Position: real, non-fabricated rank via get_my_community_position()
// (packages/database migration 20260901000028) — supersedes the old
// public "Top Community Member" leaderboard-of-others per JT's decision
// (2026-09-01): this is now the member's OWN standing, understated per
// the PRD, not a public ranking of other people.
function CommunityPositionCard({ position }: { position: CommunityPosition | null }) {
  return (
    <SectionCard title="📊 Community Position">
      {!position ? (
        <EmptyState>Not yet ranked — comment, upvote, or share content to start earning contribution points.</EmptyState>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', padding: '0.75rem 0 1.25rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink-deep)', margin: '0 0 0.125rem' }}>
              #{position.rank}
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              of {position.totalRanked} ranked members
            </p>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink-deep)', margin: '0 0 0.125rem' }}>
              {position.score}
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Contribution points
            </p>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

export function AchievementsAndPositionRow({ position, achievements }: { position: CommunityPosition | null; achievements: EarnedAchievement[] }) {
  return (
    <div className="grid-collapse-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
      <AchievementsCard achievements={achievements} />
      <CommunityPositionCard position={position} />
    </div>
  )
}
