import Link from 'next/link'

interface ContentCardProps {
  id: string
  title: string
  slug: string
  type: string
  summary: string | null
  cover_image_url: string | null
  pricing_type: string
  price_amount: number | null
  currency: string
  view_count: number
  upvote_count: number
  tags: string[]
  published_at: string | null
}

const TYPE_LABELS: Record<string, string> = {
  article: 'Article',
  ebook: 'Ebook',
  template: 'Template',
  course: 'Course',
}

const TYPE_COLORS: Record<string, string> = {
  article: '#1d4ed8',
  ebook: '#6d28d9',
  template: '#15803d',
  course: '#c2410c',
}

function formatPrice(amount: number | null, currency: string) {
  if (!amount) return null
  const symbol = currency === 'NGN' ? '₦' : currency + ' '
  return `${symbol}${(amount / 100).toLocaleString()}`
}

export function ContentCard(props: ContentCardProps) {
  const { title, slug, type, summary, cover_image_url, pricing_type, price_amount, currency, view_count, upvote_count, tags } = props
  const href = type === 'article' ? `/articles/${slug}` : `/content/${slug}`
  const label = TYPE_LABELS[type] ?? type
  const color = TYPE_COLORS[type] ?? '#374151'
  const price = formatPrice(price_amount, currency)

  return (
    <article style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 200ms',
    }}>
      {cover_image_url ? (
        <Link href={href}>
          <img
            src={cover_image_url}
            alt={title}
            style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
          />
        </Link>
      ) : (
        <div style={{
          width: '100%', height: '120px',
          background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem',
        }}>
          {type === 'article' ? '📄' : type === 'ebook' ? '📚' : type === 'template' ? '📋' : '🎓'}
        </div>
      )}

      <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            background: `${color}18`, color,
            fontSize: '0.7rem', fontWeight: 600, padding: '0.125rem 0.5rem',
            borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {label}
          </span>
          {pricing_type === 'paid' && price ? (
            <span style={{
              background: '#fef9c3', color: '#a16207',
              fontSize: '0.7rem', fontWeight: 600, padding: '0.125rem 0.5rem',
              borderRadius: '9999px',
            }}>
              {price}
            </span>
          ) : (
            <span style={{
              background: '#dcfce7', color: '#15803d',
              fontSize: '0.7rem', fontWeight: 600, padding: '0.125rem 0.5rem',
              borderRadius: '9999px',
            }}>
              Free
            </span>
          )}
        </div>

        <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, lineHeight: 1.4, color: '#111827' }}>
            {title}
          </h3>
        </Link>

        {summary && (
          <p style={{
            margin: 0, fontSize: '0.8125rem', color: '#6b7280',
            lineHeight: 1.5, overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          } as React.CSSProperties}>
            {summary}
          </p>
        )}

        {tags && tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '0.25rem' }}>
            {tags.slice(0, 3).map(tag => (
              <span key={tag} style={{
                background: '#f3f4f6', color: '#6b7280',
                fontSize: '0.7rem', padding: '0.125rem 0.375rem', borderRadius: '4px',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          fontSize: '0.75rem', color: '#9ca3af', paddingTop: '0.375rem',
          borderTop: '1px solid #f3f4f6', marginTop: '0.25rem',
        }}>
          <span>{view_count.toLocaleString()} views</span>
          <span>{upvote_count} upvotes</span>
        </div>
      </div>
    </article>
  )
}
