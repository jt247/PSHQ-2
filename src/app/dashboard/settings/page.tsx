import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileSettings } from '@/components/dashboard/ProfileSettings'
import type { UserRow } from '@/types/database'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profileRaw } = await supabase
    .from('users')
    .select('full_name, first_name, last_name, job_role, country, areas_of_interest, email, bio')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as Pick<UserRow, 'full_name' | 'first_name' | 'last_name' | 'job_role' | 'country' | 'areas_of_interest' | 'email' | 'bio'> | null

  return (
    <div className="dash-content" style={{ maxWidth: '640px' }}>
      <section style={{ marginBottom: '2rem' }}>
        <h1 className="text-headline-xl" style={{ color: 'var(--color-ink-deep)', marginBottom: '0.375rem' }}>Settings</h1>
        <p className="text-body-lg" style={{ color: 'var(--color-text-muted)' }}>
          Manage your profile and account preferences.
        </p>
      </section>
      <ProfileSettings user={{ ...(profile ?? {}), id: user.id, email: profile?.email ?? user.email ?? '' } as import('@/types/database').UserRow} />
    </div>
  )
}
