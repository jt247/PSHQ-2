import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { CaseEntryForm } from '@/components/admin/initiatives/CaseEntryForm'
import { updateCaseEntryAction } from '../actions'

export default async function EditCaseEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const service = createServiceClient()

  const { data: entry, error } = await service
    .from('case_library_entries')
    .select('*, case_library_files(id, file_url, file_label, file_type)')
    .eq('id', id)
    .single()

  if (error || !entry) notFound()

  const boundAction = updateCaseEntryAction.bind(null, id)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link href="/admin/initiatives/case-library" className="back-link">← Case Library</Link>
          <h1>Edit: {entry.title}</h1>
        </div>
      </div>
      <div className="admin-card" style={{ padding: '1.5rem' }}>
        <CaseEntryForm
          entry={{
            id: entry.id,
            title: entry.title,
            company_name: entry.company_name,
            description: entry.description,
            thumbnail_url: entry.thumbnail_url,
            tags: entry.tags ?? [],
            status: entry.status,
            files: (entry.case_library_files ?? []) as { id: string; file_url: string; file_label: string | null; file_type: string | null }[],
          }}
          action={boundAction}
          backHref="/admin/initiatives/case-library"
        />
      </div>
    </div>
  )
}
