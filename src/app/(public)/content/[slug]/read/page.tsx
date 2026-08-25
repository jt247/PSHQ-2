import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ShareButton } from '@/components/content/ShareButton'
import { absoluteUrl } from '@/lib/seo/constants'
import { isViewableInline } from '@/lib/viewable'

interface Props { params: Promise<{ slug: string }> }

// Never indexed — this is a viewer chrome around a signed-in-only file, not
// a page with content of its own worth ranking. The canonical points back
// at the content detail page, which is the one that should show up in search.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    robots: { index: false, follow: false },
    alternates: { canonical: `/content/${slug}` },
  }
}

export default async function ReadContentPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/sign-in?redirect=/content/${slug}/read`)

  const { data: item, error } = await supabase
    .from('content')
    .select('id, title, pricing_type, file_url, status')
    .eq('slug', slug)
    .eq('status', 'published')
    .not('type', 'eq', 'article')
    .single()

  if (error || !item) notFound()

  // Same access rule as the detail page and the API routes: free content,
  // signed in, file present, and a type /api/view can actually render
  // (PDF natively, xlsx/xls as a rendered table). Anything else has no
  // reader to send them to — the detail page never links here in that
  // case, but a typed-in URL is guarded the same way.
  if (item.pricing_type !== 'free' || !isViewableInline(item.file_url)) redirect(`/content/${slug}`)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-darker)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        padding: '0.75rem var(--spacing-margin-edge)',
        background: 'var(--color-paper-base)',
        borderBottom: '1px solid color-mix(in srgb, var(--color-tertiary) 10%, transparent)',
        flexShrink: 0,
      }}>
        <Link
          href={`/content/${slug}`}
          className="text-label-sm"
          style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}
        >
          ← Back
        </Link>

        <p className="text-body-md" style={{
          margin: 0, fontWeight: 600, color: 'var(--color-ink-deep)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', flex: 1,
        }}>
          {item.title}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <div style={{ width: '8.5rem' }}>
            <ShareButton contentId={item.id} title={item.title} url={absoluteUrl(`/content/${slug}`)} />
          </div>
          <a
            href={`/api/download/${item.id}`}
            className="btn-primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            Download
          </a>
        </div>
      </header>

      <iframe
        src={`/api/view/${item.id}`}
        title={item.title}
        style={{ flex: 1, width: '100%', border: 'none' }}
      />
    </div>
  )
}
