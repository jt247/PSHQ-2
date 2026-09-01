import type { Metadata } from 'next'
import { createServiceClient } from '@pshq/api-client/server'
import { ContentCard } from '@/components/content/ContentCard'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'

export const metadata: Metadata = {
  title: 'Build Notes — Lessons From Real Product Work',
  description: 'Lessons from building, shipping, breaking, and operating real products — first-hand accounts from JT, not theory.',
  alternates: { canonical: '/build-notes' },
}

async function getBuildNotes() {
  const service = createServiceClient()
  const { data } = await service
    .from('content')
    .select('id,title,slug,type,summary,cover_image_url,tags,view_count,upvote_count,published_at')
    .eq('type', 'build_note')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  return data ?? []
}

export default async function BuildNotesPage() {
  const notes = await getBuildNotes()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/build-notes" />

      <main style={{ flex: 1, maxWidth: '64rem', margin: '0 auto', width: '100%', padding: '5rem var(--spacing-margin-edge)' }}>
        <section style={{ maxWidth: '52ch', marginBottom: '3rem' }}>
          <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.875rem' }}>Build Notes</h1>
          <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
            Lessons from building, shipping, breaking, growing, and operating real products — first hand, not theory.
          </p>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
          {notes.map(n => <ContentCard key={n.id} {...n} />)}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
