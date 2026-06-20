import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { EditionForm } from '@/components/admin/initiatives/EditionForm'
import { updateEditionAction } from '../actions'

export default async function EditEditionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const service = createServiceClient()

  const { data: edition, error } = await service
    .from('initiative_editions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !edition) notFound()

  const boundAction = updateEditionAction.bind(null, id)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link href="/admin/initiatives/product-lab" className="back-link">← Product Lab</Link>
          <h1>Edit Edition {edition.edition_number}</h1>
        </div>
      </div>
      <div className="admin-card" style={{ padding: '1.5rem' }}>
        <EditionForm
          edition={{
            id: edition.id,
            edition_number: edition.edition_number,
            title: edition.title,
            focus_description: edition.focus_description,
            status: edition.status,
            join_method: edition.join_method,
            join_instructions: edition.join_instructions,
            stats: (edition.stats as Record<string, string | number>) ?? {},
            display_order: edition.display_order,
          }}
          action={boundAction}
          backHref="/admin/initiatives/product-lab"
        />
      </div>
    </div>
  )
}
