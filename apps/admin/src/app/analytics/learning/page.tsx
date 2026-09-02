import { webUrl } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import type { UserRow } from '@pshq/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'super_admin'].includes((p as UserRow).role)) redirect(`${webUrl()}/dashboard`)
}

// Epic H §H.12 — path starts/completions, module completion and drop-off,
// average completion time, exercise completion, and AI-generated path
// creation/completion (reading Epic E's Create My Learning Path feature —
// learning_paths.source = 'ai_generated').
export default async function LearningAnalyticsPage() {
  await requireAdmin()
  const service = createServiceClient()

  const [pathsRes, userPathsRes, modulesRes, moduleProgressRes, exercisesRes, aiPathsRes] = await Promise.all([
    service.from('learning_paths').select('id, title, status'),
    service.from('user_learning_paths').select('learning_path_id, started_at, completed_at'),
    service.from('learning_path_modules').select('id, learning_path_id, title, sequence'),
    service.from('module_progress').select('module_id, status, completed_at, updated_at'),
    service.from('exercise_responses').select('id', { count: 'exact', head: true }),
    service.from('learning_paths').select('id, title, source, created_at').eq('source', 'ai_generated'),
  ])

  const pathTitle = new Map((pathsRes.data ?? []).map(p => [p.id, p.title]))
  const userPaths = (userPathsRes.data ?? []) as Array<{ learning_path_id: string; started_at: string; completed_at: string | null }>

  const startsByPath = new Map<string, number>()
  const completionsByPath = new Map<string, number>()
  const completionTimes: number[] = []
  for (const up of userPaths) {
    startsByPath.set(up.learning_path_id, (startsByPath.get(up.learning_path_id) ?? 0) + 1)
    if (up.completed_at) {
      completionsByPath.set(up.learning_path_id, (completionsByPath.get(up.learning_path_id) ?? 0) + 1)
      completionTimes.push((new Date(up.completed_at).getTime() - new Date(up.started_at).getTime()) / 86400000)
    }
  }
  const avgCompletionDays = completionTimes.length > 0 ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length) : null

  const pathRows = Array.from(pathTitle.entries()).map(([id, title]) => ({
    id, title,
    starts: startsByPath.get(id) ?? 0,
    completions: completionsByPath.get(id) ?? 0,
    completionRate: (startsByPath.get(id) ?? 0) > 0 ? Math.round(((completionsByPath.get(id) ?? 0) / (startsByPath.get(id) ?? 1)) * 100) : 0,
  })).sort((a, b) => b.starts - a.starts)

  // Module drop-off: modules with completions far below their path's start count.
  const moduleCompletions = new Map<string, number>()
  for (const mp of (moduleProgressRes.data ?? []) as Array<{ module_id: string; status: string }>) {
    if (mp.status === 'completed') moduleCompletions.set(mp.module_id, (moduleCompletions.get(mp.module_id) ?? 0) + 1)
  }
  const modules = (modulesRes.data ?? []) as Array<{ id: string; learning_path_id: string; title: string; sequence: number }>
  const moduleRows = modules
    .map(m => ({
      title: m.title,
      pathTitle: pathTitle.get(m.learning_path_id) ?? '—',
      sequence: m.sequence,
      completions: moduleCompletions.get(m.id) ?? 0,
      pathStarts: startsByPath.get(m.learning_path_id) ?? 0,
    }))
    .filter(m => m.pathStarts > 0)
    .map(m => ({ ...m, dropOffRate: Math.round((1 - m.completions / m.pathStarts) * 100) }))
    .sort((a, b) => b.dropOffRate - a.dropOffRate)
    .slice(0, 15)

  const aiPaths = (aiPathsRes.data ?? []) as Array<{ id: string; title: string; created_at: string }>
  const aiPathIds = new Set(aiPaths.map(p => p.id))
  const aiPathCompletions = userPaths.filter(up => aiPathIds.has(up.learning_path_id) && up.completed_at).length

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Learning Analytics</h1>
          <p className="admin-page-subtitle">Real path starts/completions, module drop-off, exercise completion, and Create My Learning Path (AI) usage.</p>
        </div>
      </div>

      <div className="grid-collapse-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Avg. completion time', value: avgCompletionDays !== null ? `${avgCompletionDays}d` : 'Not enough data yet' },
          { label: 'Exercise completions', value: (exercisesRes.count ?? 0).toLocaleString() },
          { label: 'AI paths created', value: aiPaths.length.toLocaleString() },
          { label: 'AI paths completed', value: aiPathCompletions.toLocaleString() },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.25rem' }}>{k.value}</p>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', margin: 0 }}>{k.label}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1rem', margin: '1.5rem 0 1rem' }}>Paths</h2>
      <div className="table-scroll" style={{ marginBottom: '1.5rem' }}>
        <table className="admin-table">
          <thead><tr><th>Path</th><th>Starts</th><th>Completions</th><th>Completion rate</th></tr></thead>
          <tbody>
            {pathRows.length === 0 ? (
              <tr><td colSpan={4} className="table-empty">No learning paths yet.</td></tr>
            ) : pathRows.map(p => (
              <tr key={p.id}><td className="td-title">{p.title}</td><td className="td-num">{p.starts}</td><td className="td-num">{p.completions}</td><td className="td-num">{p.completionRate}%</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: '1rem', margin: '1.5rem 0 1rem' }}>Highest module drop-off</h2>
      <div className="table-scroll">
        <table className="admin-table">
          <thead><tr><th>Module</th><th>Path</th><th>Completions</th><th>Path starts</th><th>Drop-off</th></tr></thead>
          <tbody>
            {moduleRows.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">Not enough data yet.</td></tr>
            ) : moduleRows.map((m, i) => (
              <tr key={i}><td>{m.title}</td><td>{m.pathTitle}</td><td className="td-num">{m.completions}</td><td className="td-num">{m.pathStarts}</td><td className="td-num">{m.dropOffRate}%</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
