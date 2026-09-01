import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@pshq/api-client/server'
import { getPublicProfile } from '@pshq/api-client/dashboard'
import { trackProfileViewed } from '@pshq/analytics'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

// Epic D §D.4/§D.5 — privacy enforcement (public/members-only/private)
// happens entirely inside get_public_profile() (packages/database
// migration 20260901000028), which is deliberately the ONLY sanctioned
// read path for another member's row. A private profile someone else
// tries to view and a username that doesn't exist look identical here —
// both resolve to notFound() — so a private profile's existence isn't
// leaked either.
export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params
  const supabase = await createClient()
  const profile = await getPublicProfile(supabase, username)
  if (!profile) return { title: 'Profile not found' }
  return {
    title: `${profile.fullName ?? profile.username} — Product Slice HQ`,
    description: profile.headline ?? undefined,
    alternates: { canonical: `/profile/${profile.username}` },
  }
}

const LINK_FIELDS: Array<[key: 'linkedinUrl' | 'portfolioUrl' | 'websiteUrl' | 'githubUrl' | 'xUrl', label: string]> = [
  ['linkedinUrl', 'LinkedIn'], ['portfolioUrl', 'Portfolio'], ['websiteUrl', 'Website'],
  ['githubUrl', 'GitHub'], ['xUrl', 'X'],
]

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profile = await getPublicProfile(supabase, username)
  if (!profile) notFound()

  const isOwnProfile = user?.id === profile.id
  await trackProfileViewed({ supabase, source: 'web', userId: user?.id ?? null }, profile.id)

  const location = [profile.country, profile.region].filter(Boolean).join(', ')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav />

      <main style={{ flex: 1, maxWidth: '40rem', margin: '0 auto', width: '100%', padding: '4rem var(--spacing-margin-edge) 6rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.fullName ?? profile.username ?? ''} width={72} height={72} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0, background: 'var(--color-paper-darker)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.75rem', color: 'var(--color-text-muted)' }}>
              {(profile.fullName ?? profile.username ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-headline-lg" style={{ color: 'var(--color-ink-deep)', margin: '0 0 0.25rem' }}>{profile.fullName ?? profile.username}</h1>
            {profile.headline && <p className="text-body-md" style={{ color: 'var(--color-text-muted)', margin: 0 }}>{profile.headline}</p>}
          </div>
        </header>

        {isOwnProfile && (
          <p style={{ marginBottom: '1.5rem' }}>
            <Link href="/dashboard/settings" className="text-label-sm" style={{ color: 'var(--color-ink-deep)', fontWeight: 600 }}>Edit your profile →</Link>
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {profile.jobRole && <span className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-ink-deep)' }}>{profile.jobRole}{profile.company ? ` @ ${profile.company}` : ''}</span>}
          {location && <span className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-ink-deep)' }}>{location}</span>}
          {profile.experienceLevel && <span className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-ink-deep)' }}>{profile.experienceLevel}{profile.yearsExperience ? ` · ${profile.yearsExperience}y` : ''}</span>}
        </div>

        {profile.bio && <p className="text-body-lg" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>{profile.bio}</p>}

        {profile.skills.length > 0 && (
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 className="text-label-sm" style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>Skills</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {profile.skills.map(s => <span key={s} className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-ink-deep)' }}>{s}</span>)}
            </div>
          </section>
        )}

        {(profile.topicNames.length > 0 || profile.goalNames.length > 0) && (
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 className="text-label-sm" style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>Focused on</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {[...profile.topicNames, ...profile.goalNames].map(t => <span key={t} className="badge" style={{ background: 'color-mix(in srgb, var(--color-ink-deep) 8%, transparent)', color: 'var(--color-ink-deep)' }}>{t}</span>)}
            </div>
          </section>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Paths Completed', value: profile.completedPathsCount },
            { label: 'Resources Completed', value: profile.completedResourcesCount },
            { label: 'Contribution Points', value: profile.contributionScore },
          ].map(s => (
            <div key={s.label} style={{ background: '#ffffff', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)', borderRadius: '0.625rem', padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-ink-deep)', margin: '0 0 0.25rem' }}>{s.value}</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </section>

        {/* Achievements: Epic F owns real scoring — honest empty state,
            never a fabricated badge, same rule as the dashboard slot. */}
        <section style={{ marginBottom: '1.75rem' }}>
          <h2 className="text-label-sm" style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>Achievements</h2>
          <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>No achievements yet.</p>
        </section>

        {LINK_FIELDS.some(([key]) => profile[key]) && (
          <section style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {LINK_FIELDS.filter(([key]) => profile[key]).map(([key, label]) => (
              <a key={key} href={profile[key]!} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ fontSize: '0.8125rem' }}>{label} →</a>
            ))}
          </section>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
