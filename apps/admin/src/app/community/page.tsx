import { createServiceClient } from '@pshq/api-client/server'
import { GrantContributionForm, AdjustScoreForm } from './client'

// Epic F §F.3's "minimal, authenticated-only way for JT to correct a
// score by hand" — this page IS the seed-mechanism, targeting the real
// leaderboard_scores table via the admin-gated RPCs, so nothing needs
// re-migration when Epic G builds the full review/approval queue on top
// of this same data.
export default async function AdminCommunityPage() {
  const service = createServiceClient()
  const { data: topScores } = await service
    .from('leaderboard_scores')
    .select('total_score, updated_at, user:users(full_name, email)')
    .order('total_score', { ascending: false })
    .limit(15)

  return (
    <div style={{ padding: '2rem', maxWidth: '720px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.375rem' }}>Community Scoring</h1>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Grant the three admin-mediated contribution actions (§F.2) or correct a member&apos;s score by hand. Full
        moderation/approval tooling is Epic G — this is the minimal seed mechanism against the real scoring table.
      </p>

      <section style={{ marginBottom: '2.5rem', padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Grant Contribution</h2>
        <GrantContributionForm />
      </section>

      <section style={{ marginBottom: '2.5rem', padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Adjust Score</h2>
        <AdjustScoreForm />
      </section>

      <section style={{ padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Top 15 (All Time)</h2>
        {(!topScores || topScores.length === 0) ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No scores yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '0.5rem 0' }}>Member</th>
                <th style={{ padding: '0.5rem 0' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {(topScores as unknown as Array<{ total_score: number; user: { full_name: string | null; email: string } | null }>).map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.5rem 0' }}>{row.user?.full_name ?? row.user?.email ?? 'Unknown'}</td>
                  <td style={{ padding: '0.5rem 0', fontWeight: 700 }}>{row.total_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
