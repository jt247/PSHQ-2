import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContentTableClient } from './ContentTableClient'
import type { UserRow } from '@/types/database'

export default async function AdminContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profileRaw } = await supabase.from('users').select('*').eq('id', user.id).single()
  const profile = profileRaw as UserRow | null
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  // Fetch stats view + featured flags from content table in parallel
  const [{ data: content, error }, { data: featuredRows }] = await Promise.all([
    supabase.from('content_stats').select('*').order('created_at', { ascending: false }),
    supabase.from('content').select('id, featured'),
  ])

  const featuredMap = new Map((featuredRows ?? []).map(r => [r.id, r.featured as boolean]))

  if (error) {
    // Fallback to plain content table if view not yet migrated
    const { data: fallback, error: fallbackError } = await supabase
      .from('content')
      .select('*')
      .order('created_at', { ascending: false })
    if (fallbackError) throw new Error(fallbackError.message)
    const withDefaults = (fallback ?? []).map(c => ({ ...c, selar_clicks: 0, featured: (c as Record<string, unknown>).featured as boolean ?? false }))
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1>Content Command Center</h1>
            <p className="admin-page-subtitle">{withDefaults.length} items total</p>
          </div>
          <Link href="/admin/content/new" className="btn-primary">+ New content</Link>
        </div>
        <ContentTableClient content={withDefaults} />
      </div>
    )
  }

  const withDefaults = (content ?? []).map(c => ({
    ...c,
    selar_clicks: (c as Record<string, unknown>).selar_clicks ?? 0,
    featured: featuredMap.get(c.id) ?? false,
  }))

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Content Command Center</h1>
          <p className="admin-page-subtitle">{withDefaults.length} items total</p>
        </div>
        <Link href="/admin/content/new" className="btn-primary">+ New content</Link>
      </div>

      <ContentTableClient content={withDefaults} />
    </div>
  )
}
