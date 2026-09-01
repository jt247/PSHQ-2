import Link from 'next/link'

interface ContentCardProps {
  id: string
  title: string
  slug: string
  type: string
  summary: string | null
  cover_image_url: string | null
  view_count: number
  upvote_count: number
  tags: string[]
  published_at: string | null
  is_coming_soon?: boolean
  needs_review?: boolean
}

// Cosmetic only — never written back anywhere, just a visible signal for
// content that hasn't had a full standards pass yet (see SIDENOTES.md).
// Driven by the existing `needs_review` column; JT clears it per item as
// each one is actually finished.
export function DraftBadge() {
  return (
    <span className="badge" title="First draft — a fuller update is coming" style={{ background: 'color-mix(in srgb, var(--color-tertiary) 15%, transparent)', color: 'var(--color-text-muted)' }}>
      V1 · Draft
    </span>
  )
}

const TYPE_LABELS: Record<string, string> = {
  article: 'Article',
  ebook: 'Ebook',
  template: 'Template',
  course: 'Course',
  guide: 'Guide',
  build_note: 'Build Note',
}

const TYPE_PLACEHOLDER: Record<string, string> = {
  article: '📄',
  ebook: '📚',
  template: '📋',
  course: '🎓',
  guide: '🧭',
  build_note: '🔧',
}

export function ContentCard(props: ContentCardProps) {
  // view_count/upvote_count are intentionally not destructured — Standing
  // Rule / PRD §5.1: view counts never render on any public-facing card.
  // They stay in the prop type since callers pass the full content row.
  const { title, slug, type, summary, cover_image_url, tags, is_coming_soon, needs_review } = props
  const href = type === 'article' ? `/articles/${slug}` : type === 'build_note' ? `/build-notes/${slug}` : `/content/${slug}`
  const label = TYPE_LABELS[type] ?? type

  const coverEl = cover_image_url ? (
    <img
      src={cover_image_url}
      alt={title}
      loading="lazy"
      width={400}
      height={160}
      style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
    />
  ) : (
    <div style={{
      width: '100%', height: '100px',
      background: 'var(--color-paper-darker)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '2rem',
      borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
    }}>
      {TYPE_PLACEHOLDER[type] ?? '📄'}
    </div>
  )

  const body = (
    <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span className="badge" style={{
          background: 'color-mix(in srgb, var(--color-ink-deep) 10%, transparent)',
          color: 'var(--color-ink-deep)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          {label}
        </span>
        {is_coming_soon && (
          <span className="badge" style={{ background: 'color-mix(in srgb, var(--color-accent-warm) 20%, transparent)', color: 'oklch(45% 0.12 85)' }}>
            Coming Soon
          </span>
        )}
        {needs_review && !is_coming_soon && <DraftBadge />}
      </div>

      <p className="text-body-lg" style={{ margin: 0, fontWeight: 600, lineHeight: 1.4, color: 'var(--color-ink-deep)' }}>
        {title}
      </p>

      {summary && (
        <p className="text-body-sm" style={{
          margin: 0, color: 'var(--color-text-muted)',
          lineHeight: 1.5, overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        } as React.CSSProperties}>
          {summary}
        </p>
      )}

      {tags && tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '0.375rem' }}>
          {tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-label-sm" style={{
              background: 'var(--color-paper-darker)',
              color: 'var(--color-text-muted)',
              padding: '0.125rem 0.5rem',
              borderRadius: '0.125rem',
              border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

    </div>
  )

  if (is_coming_soon) {
    return (
      <article className="content-card" style={{ opacity: 0.85, cursor: 'default' }} aria-disabled="true">
        <div style={{ position: 'relative' }}>
          {coverEl}
          <span style={{
            position: 'absolute', top: '0.625rem', right: '0.625rem',
            background: 'oklch(55% 0.14 85)',
            color: '#fff',
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '0.25rem 0.625rem',
            borderRadius: '0.25rem',
          }}>
            Coming Soon
          </span>
        </div>
        {body}
      </article>
    )
  }

  return (
    <article className="content-card">
      <Link href={href}>
        {coverEl}
      </Link>
      <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge" style={{
            background: 'color-mix(in srgb, var(--color-ink-deep) 10%, transparent)',
            color: 'var(--color-ink-deep)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {label}
          </span>
          {needs_review && <DraftBadge />}
        </div>

        <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 className="text-body-lg" style={{ margin: 0, fontWeight: 600, lineHeight: 1.4, color: 'var(--color-ink-deep)' }}>
            {title}
          </h3>
        </Link>

        {summary && (
          <p className="text-body-sm" style={{
            margin: 0, color: 'var(--color-text-muted)',
            lineHeight: 1.5, overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          } as React.CSSProperties}>
            {summary}
          </p>
        )}

        {tags && tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '0.375rem' }}>
            {tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-label-sm" style={{
                background: 'var(--color-paper-darker)',
                color: 'var(--color-text-muted)',
                padding: '0.125rem 0.5rem',
                borderRadius: '0.125rem',
                border: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
