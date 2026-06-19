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
    .select('full_name, first_name, last_name, job_role, country, areas_of_interest, email')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as Pick<UserRow, 'full_name' | 'first_name' | 'last_name' | 'job_role' | 'country' | 'areas_of_interest' | 'email'> | null

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>Settings</h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
          Manage your profile and account preferences.
        </p>
      </div>
      <ProfileSettings user={{ ...(profile ?? {}), id: user.id, email: profile?.email ?? user.email ?? '' } as import('@/types/database').UserRow} />
    </div>
  )
}
