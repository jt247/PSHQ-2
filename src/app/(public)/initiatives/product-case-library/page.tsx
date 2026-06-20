import Link from 'next/link'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { CaseLibraryGrid } from '@/components/case-library/CaseLibraryGrid'
import './case-library.css'

export const metadata: Metadata = {
  title: 'Product Case Library — Product Slice HQ',
  description:
    'A growing archive of product deep dives, teardowns, and case studies — built for people who learn best from studying real product decisions.',
}

interface CaseFile {
  id: string
  file_url: string
  file_label: string | null
  file_type: string | null
}

interface CaseEntry {
  id: string
  title: string
  company_name: string
  description: string | null
  thumbnail_url: string | null
  tags: string[]
  files: CaseFile[]
}

async function getEntries(): Promise<CaseEntry[]> {
  const service = createServiceClient()

  const { data, error } = await service
    .from('case_library_entries')
    .select(`
      id, title, company_name, description, thumbnail_url, tags,
      case_library_files (id, file_url, file_label, file_type)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error || !data) return []

  return data.map(row => ({
    id: row.id,
    title: row.title,
    company_name: row.company_name,
    description: row.description,
    thumbnail_url: row.thumbnail_url,
    tags: row.tags ?? [],
    files: (row.case_library_files ?? []) as CaseFile[],
  }))
}

export default async function ProductCaseLibraryPage() {
  const entries = await getEntries()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-paper-base)' }}>
      <PublicNav activeHref="/initiatives" />

      <main style={{ flex: 1 }}>
        {/* Hero */}
        <header className="pcl-hero">
          <div className="pcl-hero-inner">
            <Link href="/initiatives" className="pcl-hero-back">
              ← All initiatives
            </Link>

            <p className="pcl-hero-eyebrow">Case Library</p>

            <h1>
              Real Teardowns.{' '}
              <em>Real Companies.</em>{' '}
              Real Decisions.
            </h1>

            <p className="pcl-hero-subhead">
              A growing archive of product deep dives, teardowns, and case studies —
              built for people who learn best from studying real product decisions
              instead of theory.
            </p>
          </div>
        </header>

        {/* Grid */}
        <section className="pcl-grid-section" aria-label="Case studies">
          <div className="pcl-count-bar">
            <span className="pcl-count">
              {entries.length} {entries.length === 1 ? 'case study' : 'case studies'}
            </span>
          </div>

          <CaseLibraryGrid entries={entries} />
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
