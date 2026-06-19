import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContentForm } from '@/components/admin/ContentForm'
import type { UserRow } from '@/types/database'

interface Props { params: Promise<{ id: string }> }

export default async function EditContentPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profileRaw } = await supabase.from('users').select('*').eq('id', user.id).single()
  const profile = profileRaw as UserRow | null
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  const { data: item, error } = await supabase.from('content').select('*').eq('id', id).single()
  if (error || !item) notFound()

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <Link href="/admin/content" className="back-link">← Content</Link>
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
          type:            item.type as 'article' | 'ebook' | 'template' | 'course',
          summary:         item.summary ?? '',
          body:            item.body ?? '',
          cover_image_url: item.cover_image_url ?? '',
          file_url:        (item as Record<string, unknown>).file_url as string ?? '',
          tags:            item.tags ?? [],
          pricing_type:    ((item as Record<string, unknown>).pricing_type as 'free' | 'paid') ?? 'free',
          price_amount:    (item as Record<string, unknown>).price_amount as number | null ?? null,
          currency:        ((item as Record<string, unknown>).currency as string) ?? 'NGN',
        }}
      />
    </div>
  )
}
