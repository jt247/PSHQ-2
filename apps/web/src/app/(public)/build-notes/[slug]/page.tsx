import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@pshq/api-client/server'
import { FavoriteButton } from '@/components/content/FavoriteButton'
import { ShareButton } from '@/components/content/ShareButton'
import { MarkCompleteButton } from '@/components/content/MarkCompleteButton'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { trackContentOpened } from '@pshq/analytics'
import { absoluteUrl } from '@/lib/seo/constants'
import { DraftBadge } from '@/components/content/ContentCard'

function renderBody(text: string) {
  return text.split(/\n\n+/).map((block, i) => {
    const t = block.trim()
    if (!t) return null
    return (
      <p key={i} className="text-body-lg" style={{ color: 'var(--color-text-main)', lineHeight: 1.85, marginBottom: '1.25rem' }}>
        {t}
      </p>
    )
  }).filter(Boolean)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('content').select('title, summary').eq('slug', slug).eq('type', 'build_note').eq('status', 'published').maybeSingle()
  if (!data) return {}
  return { title: `${data.title} — Build Notes`, description: data.summary ?? undefined, alternates: { canonical: `/build-notes/${slug}` } }
}

export default async function BuildNoteDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: item } = await supabase.from('content').select('*').eq('slug', slug).eq('type', 'build_note').eq('status', 'published').maybeSingle()
  if (!item) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  let isFavorited = false
  let isCompleted = false
  if (user) {
    const [{ data: fav }, { data: progress }] = await Promise.all([
      supabase.from('content_favorites').select('id').eq('content_id', item.id).eq('user_id', user.id).maybeSingle(),
      supabase.from('content_progress').select('status').eq('content_id', item.id).eq('user_id', user.id).maybeSingle(),
    ])
    isFavorited = !!fav
    isCompleted = progress?.status === 'completed'
  }

  await trackContentOpened({ supabase, source: 'web', userId: user?.id ?? null }, { contentId: item.id, contentType: 'article' })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/build-notes" />

      <main style={{ flex: 1, maxWidth: '42rem', margin: '0 auto', width: '100%', padding: '4rem var(--spacing-margin-edge) 6rem' }}>
        <Link href="/build-notes" className="text-label-sm" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>← All build notes</Link>

        <header style={{ margin: '1.5rem 0 2.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {item.needs_review && <DraftBadge />}
            {(item.tags ?? []).slice(0, 3).map((t: string) => (
              <span key={t} className="badge" style={{ background: 'var(--color-paper-darker)', color: 'var(--color-ink-deep)' }}>{t}</span>
            ))}
          </div>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '1rem' }}>{item.title}</h1>
          {item.summary && <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>{item.summary}</p>}
        </header>

        <article>{renderBody(item.body ?? '')}</article>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid color-mix(in srgb, var(--color-tertiary) 12%, transparent)' }}>
          <FavoriteButton contentId={item.id} initialFavorited={isFavorited} isLoggedIn={!!user} />
          <ShareButton contentId={item.id} title={item.title} url={absoluteUrl(`/build-notes/${item.slug}`)} />
          <MarkCompleteButton contentId={item.id} initialComplete={isCompleted} isLoggedIn={!!user} />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
