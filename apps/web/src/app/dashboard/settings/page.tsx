import { redirect } from 'next/navigation'
import { createClient } from '@pshq/api-client/server'
import { ProfileSettings } from '@/components/dashboard/ProfileSettings'
import { NotificationPreferences } from '@/components/dashboard/NotificationPreferences'
import type { UserRow } from '@pshq/database'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [profileRes, topicsRes, goalsRes, userTopicsRes, userGoalsRes, notifPrefsRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('topics').select('name').order('sort_order'),
    supabase.from('goals').select('name').order('sort_order'),
    supabase.from('user_topics').select('topic:topics(name)').eq('user_id', user.id),
    supabase.from('user_goals').select('goal:goals(name)').eq('user_id', user.id),
    supabase.from('notification_preferences').select('key, enabled').eq('user_id', user.id),
  ])

  const profile = profileRes.data as UserRow
  const topicOptions = (topicsRes.data ?? []).map(t => t.name)
  const goalOptions = (goalsRes.data ?? []).map(g => g.name)
  const initialTopics = ((userTopicsRes.data ?? []) as unknown as Array<{ topic: { name: string } | null }>).map(t => t.topic?.name).filter((n): n is string => !!n)
  const initialGoals = ((userGoalsRes.data ?? []) as unknown as Array<{ goal: { name: string } | null }>).map(g => g.goal?.name).filter((n): n is string => !!n)
  const disabledKeys = (notifPrefsRes.data ?? []).filter(p => !p.enabled).map(p => p.key)

  return (
    <div className="dash-content" style={{ maxWidth: '640px' }}>
      <section style={{ marginBottom: '2rem' }}>
        <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.375rem' }}>Settings</h1>
        <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
          Manage your profile and account preferences.
        </p>
      </section>

      <ProfileSettings
        user={profile}
        topicOptions={topicOptions}
        goalOptions={goalOptions}
        initialTopics={initialTopics}
        initialGoals={initialGoals}
      />

      <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 0.375rem' }}>Notifications</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
          Choose what you hear about. Everything is on by default.
        </p>
        <NotificationPreferences disabledKeys={disabledKeys} />
      </div>
    </div>
  )
}
