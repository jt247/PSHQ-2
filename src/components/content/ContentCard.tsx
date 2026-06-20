import Link from 'next/link'

interface ContentCardProps {
  id: string
  title: string
  slug: string
  type: string
  summary: string | null
  cover_image_url: string | null
  pricing_type: string
  selar_url?: string | null
  view_count: number
  upvote_count: number
  tags: string[]
  published_at: string | null
  is_coming_soon?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  article: 'Article',
  ebook: 'Ebook',
  template: 'Template',
  course: 'Course',
}

const TYPE_PLACEHOLDER: Record<string, string> = {
  article: '📄',
  ebook: '📚',
  template: '📋',
  course: '🎓',
}

export function ContentCard(props: ContentCardProps) {
  const { title, slug, type, summary, cover_image_url, pricing_type, view_count, upvote_count, tags, is_coming_soon } = props
  const href = type === 'article' ? `/articles/${slug}` : `/content/${slug}`
  const label = TYPE_LABELS[type] ?? type

  const coverEl = cover_image_url ? (
    <img
      src={cover_image_url}
      alt={title}
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
        {is_coming_soon ? (
          <span className="badge" style={{ background: 'color-mix(in srgb, var(--color-accent-warm) 20%, transparent)', color: 'oklch(45% 0.12 85)' }}>
            Coming Soon
          </span>
        ) : pricing_type === 'paid' ? (
          <span className="badge" style={{ background: 'color-mix(in srgb, var(--color-accent-warm) 20%, transparent)', color: 'oklch(45% 0.12 85)' }}>
            Available on Selar
          </span>
        ) : (
          <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>Free</span>
        )}
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

      {!is_coming_soon && (
        <div className="text-label-sm" style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          color: 'var(--color-text-muted)', paddingTop: '0.5rem',
          borderTop: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
          marginTop: '0.25rem',
        }}>
          <span>{view_count.toLocaleString()} views</span>
          <span>·</span>
          <span>{upvote_count} upvotes</span>
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
          {pricing_type === 'paid' ? (
            <span className="badge" style={{ background: 'color-mix(in srgb, var(--color-accent-warm) 20%, transparent)', color: 'oklch(45% 0.12 85)' }}>
              Available on Selar
            </span>
          ) : (
            <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>Free</span>
          )}
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

        <div className="text-label-sm" style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          color: 'var(--color-text-muted)', paddingTop: '0.5rem',
          borderTop: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)',
          marginTop: '0.25rem',
        }}>
          <span>{view_count.toLocaleString()} views</span>
          <span>·</span>
          <span>{upvote_count} upvotes</span>
        </div>
      </div>
    </article>
  )
}
