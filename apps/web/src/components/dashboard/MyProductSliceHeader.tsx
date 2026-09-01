import Link from 'next/link'

interface Props {
  avatarUrl: string | null
  name: string
  headline: string | null
  streak: number
  profileCompletionPercent: number
  greeting: string
}

// Epic D §D.2 header: "photo, name, professional headline, current
// learning streak, profile completion percentage." Replaces the old
// plain welcome banner text with real per-member signal.
export function MyProductSliceHeader({ avatarUrl, name, headline, streak, profileCompletionPercent, greeting }: Props) {
  return (
    <section className="flex-wrap-mobile" style={{
      background: 'var(--color-ink-deep)',
      borderRadius: '0.875rem',
      padding: '2rem 2.5rem',
      marginBottom: '1.75rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(250,204,21,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} width={56} height={56} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.15)' }} />
        ) : (
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0,
            background: 'color-mix(in srgb, var(--color-accent-warm) 25%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-accent-warm)',
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--color-accent-warm)', marginBottom: '0.375rem',
          }}>
            {greeting}
          </p>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.375rem, 2.6vw, 1.875rem)',
            fontWeight: 700, color: '#ffffff', margin: '0 0 0.375rem',
            letterSpacing: '-0.02em', lineHeight: 1.2,
          }}>
            {name}
          </h1>
          {headline && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              {headline}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexShrink: 0, position: 'relative' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.375rem', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1 }}>
            🔥 {streak}
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0.25rem 0 0' }}>
            Day streak
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.375rem', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1 }}>
            {profileCompletionPercent}%
          </p>
          <Link href="/dashboard/settings" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0.25rem 0 0', textDecoration: 'none', display: 'block' }}>
            Profile complete
          </Link>
        </div>
      </div>
    </section>
  )
}
