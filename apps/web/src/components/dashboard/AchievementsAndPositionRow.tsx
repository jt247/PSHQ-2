import type { CommunityPosition } from '@pshq/api-client/dashboard'
import { SectionCard, EmptyState } from './DashboardPrimitives'

// Achievements: Epic F owns real scoring — this is deliberately an honest
// empty slot forever, until that epic lands, per the build prompt
// ("Complete your first learning activity to earn an achievement,"
// established in Build Prompt 1). Never fabricate a badge here.
function AchievementsCard() {
  return (
    <SectionCard title="🏅 Achievements">
      <EmptyState>Complete your first learning activity to earn an achievement.</EmptyState>
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

export function AchievementsAndPositionRow({ position }: { position: CommunityPosition | null }) {
  return (
    <div className="grid-collapse-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
      <AchievementsCard />
      <CommunityPositionCard position={position} />
    </div>
  )
}
