import { webUrl } from '@/lib/auth/actions'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { LearningPathForm } from '@/components/admin/LearningPathForm'
import { LearningPathModules } from '@/components/admin/LearningPathModules'
import { updateLearningPathAction, setLearningPathStatusAction } from '../../actions'
import type { UserRow } from '@pshq/database'

export default async function EditLearningPathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'super_admin'].includes((p as UserRow).role)) redirect(`${webUrl()}/dashboard`)

  const service = createServiceClient()
  const [pathRes, modulesRes, contentRes] = await Promise.all([
    service.from('learning_paths').select('*').eq('id', id).single(),
    service.from('learning_path_modules').select('*').eq('learning_path_id', id).order('sequence'),
    service.from('content').select('id, title').eq('status', 'published').order('title').limit(300),
  ])

  if (pathRes.error || !pathRes.data) notFound()
  const path = pathRes.data

  const boundUpdate = updateLearningPathAction.bind(null, id)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link href="/learning-paths" className="back-link">← Learning Paths</Link>
          <h1>Edit: {path.title}</h1>
          <p className="admin-page-subtitle"><span className={`badge badge-${path.status === 'published' ? 'green' : path.status === 'archived' ? 'red' : 'gray'}`}>{path.status}</span></p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '0.5rem' }}>
          {path.status !== 'published' && <form action={setLearningPathStatusAction.bind(null, id, 'published')}><button type="submit" className="btn-primary">Publish</button></form>}
          {path.status === 'published' && <form action={setLearningPathStatusAction.bind(null, id, 'draft')}><button type="submit" className="btn-ghost">Unpublish</button></form>}
          {path.status !== 'archived' && <form action={setLearningPathStatusAction.bind(null, id, 'archived')}><button type="submit" className="btn-ghost" style={{ color: '#dc2626' }}>Archive</button></form>}
        </div>
      </div>

      <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <LearningPathForm path={path} action={boundUpdate} />
      </div>

      <div className="admin-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 1rem' }}>Modules</h2>
        <LearningPathModules pathId={id} modules={modulesRes.data ?? []} contentOptions={contentRes.data ?? []} />
      </div>
    </div>
  )
}
