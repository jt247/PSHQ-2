import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { StageManager } from '@/components/admin/initiatives/StageManager'
import { createStageAction, updateStageAction, deleteStageAction } from '../actions'

const STATUS_LABELS: Record<string, string> = {
  published: 'Published',
  coming_soon: 'Coming Soon',
  archived: 'Archived',
}

export default async function PathwayStagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const service = createServiceClient()

  const { data: pathway, error } = await service
    .from('curriculum_pathways')
    .select('*, curriculum_stages(*)')
    .eq('id', id)
    .single()

  if (error || !pathway) notFound()

  const stages = (pathway.curriculum_stages ?? []) as {
    id: string
    title: string
    description: string | null
    stage_order: number
    duration_weeks: number | null
  }[]

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link href="/admin/initiatives/curriculum" className="back-link">← Curriculum</Link>
          <h1>{pathway.title}</h1>
          <p className="admin-page-subtitle">
            {STATUS_LABELS[pathway.status] ?? pathway.status} · {stages.length} stage{stages.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="admin-card" style={{ padding: '1.5rem' }}>
        <StageManager
          pathwayId={pathway.id}
          stages={stages}
          createAction={createStageAction}
          updateAction={updateStageAction}
          deleteAction={deleteStageAction}
        />
      </div>
    </div>
  )
}
