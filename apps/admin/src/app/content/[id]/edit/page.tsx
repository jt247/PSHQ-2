import { webUrl } from '@/lib/auth/actions'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@pshq/api-client/server'
import { ContentForm } from '@/components/admin/ContentForm'
import type { UserRow } from '@pshq/database'

interface Props { params: Promise<{ id: string }> }

export default async function EditContentPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${webUrl()}/sign-in`)

  const { data: profileRaw } = await supabase.from('users').select('*').eq('id', user.id).single()
  const profile = profileRaw as UserRow | null
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect(`${webUrl()}/dashboard`)

  const { data: item, error } = await supabase.from('content').select('*').eq('id', id).single()
  if (error || !item) notFound()

  const [topics, goals, roles, series, contentTopics, contentGoals, contentRoles] = await Promise.all([
    supabase.from('topics').select('id, name').order('sort_order'),
    supabase.from('goals').select('id, name').order('sort_order'),
    supabase.from('roles').select('id, name').order('sort_order'),
    supabase.from('series').select('id, title').order('title'),
    supabase.from('content_topics').select('topic_id').eq('content_id', id),
    supabase.from('content_goals').select('goal_id').eq('content_id', id),
    supabase.from('content_roles').select('role_id').eq('content_id', id),
  ])

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link href="/content" className="back-link">← Content</Link>
          <h1>Edit: {item.title}</h1>
          <p className="admin-page-subtitle">
            <span className={`badge badge-${item.status === 'published' ? 'green' : item.status === 'archived' ? 'red' : 'gray'}`}>
              {item.status}
            </span>
            {' '}{item.type}
          </p>
        </div>
        <div className="header-actions">
          {item.status === 'published' && (
            <a
              href={item.type === 'article' ? `/articles/${item.slug}` : `/content/${item.slug}`}
              target="_blank" rel="noreferrer" className="btn-ghost"
            >
              View live ↗
            </a>
          )}
        </div>
      </div>

      <ContentForm
        mode="edit"
        id={id}
        defaultValues={{
          title:           item.title,
          slug:            item.slug,
          type:            item.type as 'article' | 'ebook' | 'template' | 'course' | 'guide' | 'build_note',
          summary:         item.summary ?? '',
          body:            item.body ?? '',
          cover_image_url: item.cover_image_url ?? '',
          file_url:        (item as Record<string, unknown>).file_url as string ?? '',
          tags:            item.tags ?? [],
          pricing_type:    ((item as Record<string, unknown>).pricing_type as 'free' | 'paid') ?? 'free',
          selar_url:       ((item as Record<string, unknown>).selar_url as string | null) ?? null,
          domain:                 (item as Record<string, unknown>).domain as string ?? '',
          level:                  (item as Record<string, unknown>).level as string ?? '',
          resource_category:      (item as Record<string, unknown>).resource_category as string ?? '',
          estimated_time_minutes: (item as Record<string, unknown>).estimated_time_minutes as number ?? undefined,
          resource_intent:        (item as Record<string, unknown>).resource_intent as string[] ?? [],
          seo_title:              (item as Record<string, unknown>).seo_title as string ?? '',
          seo_description:        (item as Record<string, unknown>).seo_description as string ?? '',
          canonical_url:          (item as Record<string, unknown>).canonical_url as string ?? '',
          og_image_url:           (item as Record<string, unknown>).og_image_url as string ?? '',
          series_id:              (item as Record<string, unknown>).series_id as string ?? '',
          topic_ids: (contentTopics.data ?? []).map(t => t.topic_id),
          goal_ids:  (contentGoals.data ?? []).map(g => g.goal_id),
          role_ids:  (contentRoles.data ?? []).map(r => r.role_id),
        }}
        topics={topics.data ?? []}
        goals={goals.data ?? []}
        roles={roles.data ?? []}
        series={series.data ?? []}
      />
    </div>
  )
}
