import { redirect } from 'next/navigation'
import { createClient } from '@pshq/api-client/server'
import { CreatePathForm } from '@/components/learning-paths/CreatePathForm'
import type { UserRow } from '@pshq/database'

export default async function CreateLearningPathPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [profileRes, topicsRes, userTopicsRes, roleRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('topics').select('id, name').order('sort_order'),
    supabase.from('user_topics').select('topic:topics(name)').eq('user_id', user.id),
    supabase.from('users').select('roles:primary_role_id(name)').eq('id', user.id).maybeSingle(),
  ])

  const profile = profileRes.data as UserRow | null
  const topicOptions = (topicsRes.data ?? []).map(t => t.name)
  const initialTopics = ((userTopicsRes.data ?? []) as unknown as Array<{ topic: { name: string } | null }>).map(t => t.topic?.name).filter((n): n is string => !!n)
  const roleName = (roleRes.data as unknown as { roles: { name: string } | null } | null)?.roles?.name ?? null

  return (
    <div className="dash-content" style={{ maxWidth: '640px' }}>
      <section style={{ marginBottom: '2rem' }}>
        <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.375rem' }}>Create My Learning Path</h1>
        <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
          A handful of questions, most already prefilled from your profile. We&apos;ll build a path entirely from real ProductSlice content.
        </p>
      </section>

      <CreatePathForm
        initial={{
          roleName,
          level: profile?.experience_level ?? null,
          skills: profile?.skills ?? [],
          topicOptions,
          initialTopics,
        }}
      />
    </div>
  )
}
