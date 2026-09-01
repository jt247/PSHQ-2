'use client'

import { useState, useActionState } from 'react'
import { updateProfileAction, sendPasswordResetAction, type ProfileState } from '@/app/dashboard/actions'
import { AreaPicker } from '@/components/dashboard/AreaPicker'
import { ChipMultiSelect } from '@/components/onboarding/ChipSelect'
import type { UserRow } from '@pshq/database'

const initState: ProfileState = {}

const COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Ethiopia', 'Tanzania',
  'Uganda', 'Senegal', 'Rwanda', 'Cameroon', 'Ivory Coast', 'Zimbabwe',
  'Zambia', 'Mozambique', 'Other',
]

const EXPERIENCE_LEVELS: Array<{ value: string; label: string }> = [
  { value: 'exploring', label: 'Exploring the field' },
  { value: 'beginner', label: 'Beginner (0-2 years)' },
  { value: 'intermediate', label: 'Intermediate (2-5 years)' },
  { value: 'senior', label: 'Senior (5-10 years)' },
  { value: 'leader', label: 'Leader (10+ years)' },
]

const PRIVACY_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: 'public', label: 'Public', description: 'Anyone can view your profile, including signed-out visitors.' },
  { value: 'community', label: 'Members only', description: 'Only signed-in Product Slice HQ members can view your profile.' },
  { value: 'private', label: 'Private', description: 'Only you can view your profile.' },
]

interface Props {
  user: UserRow
  topicOptions: string[]
  goalOptions: string[]
  initialTopics: string[]
  initialGoals: string[]
}

export function ProfileSettings({ user, topicOptions, goalOptions, initialTopics, initialGoals }: Props) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initState)
  const [resetMsg, setResetMsg] = useState<string | null>(null)

  async function handleReset() {
    setResetMsg('Sending…')
    const result = await sendPasswordResetAction()
    setResetMsg(result.success ? 'Reset email sent! Check your inbox.' : result.error ?? 'Failed.')
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 1.5rem' }}>
        Profile & Settings
      </h2>

      <form action={formAction} className="settings-form">
        <div className="settings-field">
          <label htmlFor="username">Username</label>
          <input id="username" name="username" defaultValue={user.username ?? ''} placeholder="ada_lovelace" pattern="[a-z0-9_]{3,30}" title="Lowercase letters, numbers, underscores. 3-30 characters." />
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
            {user.username ? `Your profile: /profile/${user.username}` : 'Claim a username to get a public profile link. You can change it any time.'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="settings-field">
            <label htmlFor="first_name">First name</label>
            <input id="first_name" name="first_name" defaultValue={user.first_name ?? ''} placeholder="Ada" />
          </div>
          <div className="settings-field">
            <label htmlFor="last_name">Last name</label>
            <input id="last_name" name="last_name" defaultValue={user.last_name ?? ''} placeholder="Lovelace" />
          </div>
        </div>

        <div className="settings-field">
          <label htmlFor="headline">Professional headline</label>
          <input id="headline" name="headline" defaultValue={user.headline ?? ''} placeholder="Senior PM building AI-native products" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="settings-field">
            <label htmlFor="job_role">Current role</label>
            <input id="job_role" name="job_role" defaultValue={user.job_role ?? ''} placeholder="Senior Product Manager" />
          </div>
          <div className="settings-field">
            <label htmlFor="company">Company</label>
            <input id="company" name="company" defaultValue={user.company ?? ''} placeholder="Acme Inc." />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="settings-field">
            <label htmlFor="country">Country</label>
            <select id="country" name="country" defaultValue={user.country ?? ''}>
              <option value="">Select country…</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="settings-field">
            <label htmlFor="region">State / region</label>
            <input id="region" name="region" defaultValue={user.region ?? ''} placeholder="Lagos" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="settings-field">
            <label htmlFor="experience_level">Experience level</label>
            <select id="experience_level" name="experience_level" defaultValue={user.experience_level ?? ''}>
              <option value="">Select…</option>
              {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div className="settings-field">
            <label htmlFor="years_experience">Years of experience (optional)</label>
            <input id="years_experience" name="years_experience" type="number" min={0} max={60} defaultValue={user.years_experience ?? ''} />
          </div>
        </div>

        <div className="settings-field">
          <label htmlFor="bio">Bio</label>
          <textarea id="bio" name="bio" defaultValue={user.bio ?? ''} placeholder="Tell us a bit about yourself…" rows={3} style={{ resize: 'vertical' }} />
        </div>

        <div className="settings-field">
          <label htmlFor="skills">Skills (comma separated)</label>
          <input id="skills" name="skills" defaultValue={(user.skills ?? []).join(', ')} placeholder="Roadmapping, SQL, User Research" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="settings-field">
            <label htmlFor="linkedin_url">LinkedIn</label>
            <input id="linkedin_url" name="linkedin_url" type="url" defaultValue={user.linkedin_url ?? ''} placeholder="https://linkedin.com/in/…" />
          </div>
          <div className="settings-field">
            <label htmlFor="portfolio_url">Portfolio</label>
            <input id="portfolio_url" name="portfolio_url" type="url" defaultValue={user.portfolio_url ?? ''} placeholder="https://…" />
          </div>
          <div className="settings-field">
            <label htmlFor="website_url">Website</label>
            <input id="website_url" name="website_url" type="url" defaultValue={user.website_url ?? ''} placeholder="https://…" />
          </div>
          <div className="settings-field">
            <label htmlFor="github_url">GitHub</label>
            <input id="github_url" name="github_url" type="url" defaultValue={user.github_url ?? ''} placeholder="https://github.com/…" />
          </div>
          <div className="settings-field">
            <label htmlFor="x_url">X (Twitter)</label>
            <input id="x_url" name="x_url" type="url" defaultValue={user.x_url ?? ''} placeholder="https://x.com/…" />
          </div>
        </div>

        <div className="settings-field">
          <label>Topics</label>
          <ChipMultiSelect name="topics" options={topicOptions} initial={initialTopics} />
        </div>

        <div className="settings-field">
          <label>Goals (up to 5)</label>
          <ChipMultiSelect name="goals" options={goalOptions} initial={initialGoals} max={5} />
        </div>

        <div className="settings-field">
          <label>Areas of interest (legacy)</label>
          <AreaPicker initial={user.areas_of_interest ?? []} />
        </div>

        <div className="settings-field">
          <label>Profile privacy</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.375rem' }}>
            {PRIVACY_OPTIONS.map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" name="privacy_tier" value={opt.value} defaultChecked={(user.privacy_tier ?? 'community') === opt.value} style={{ marginTop: '0.2rem' }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{opt.label}</p>
                  <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.5rem 0 0' }}>
            Your email is never shown on your public profile, no matter which option you pick.
          </p>
        </div>

        <div className="settings-actions">
          <button type="submit" disabled={isPending} className="btn-save">
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
          {state.success && <span className="save-msg ok">Saved!</span>}
          {state.error && <span className="save-msg err">{state.error}</span>}
        </div>
      </form>

      {/* Password reset */}
      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>Password</h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
          We&apos;ll send a reset link to <strong>{user.email}</strong>.
        </p>
        <button onClick={handleReset} className="btn-save" type="button">Send password reset email</button>
        {resetMsg && <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#6b7280' }}>{resetMsg}</p>}
      </div>
    </div>
  )
}
