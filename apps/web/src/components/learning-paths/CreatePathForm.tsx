'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChipMultiSelect } from '@/components/onboarding/ChipSelect'

const EXPERIENCE_LEVELS = [
  { value: 'exploring', label: 'Exploring the field' },
  { value: 'beginner', label: 'Beginner (0-2 years)' },
  { value: 'intermediate', label: 'Intermediate (2-5 years)' },
  { value: 'senior', label: 'Senior (5-10 years)' },
  { value: 'leader', label: 'Leader (10+ years)' },
]

interface Props {
  initial: {
    roleName: string | null
    level: string | null
    skills: string[]
    topicOptions: string[]
    initialTopics: string[]
  }
}

// Epic E §E.2 — 7 questions, most prefilled from stored profile data
// rather than re-asked blank (per the prompt's own instruction). A single
// scrollable form rather than a paginated wizard — a deliberate scope
// call given the size of this build; every field still gets a real,
// editable prefill where profile data exists.
export function CreatePathForm({ initial }: Props) {
  const router = useRouter()
  const [capChecked, setCapChecked] = useState(false)
  const [remaining, setRemaining] = useState(3)
  const [goalText, setGoalText] = useState('')
  const [roleName, setRoleName] = useState(initial.roleName ?? '')
  const [level, setLevel] = useState(initial.level ?? '')
  const [skills, setSkills] = useState(initial.skills.join(', '))
  const [weeklyMinutes, setWeeklyMinutes] = useState(120)
  const [targetTimelineWeeks, setTargetTimelineWeeks] = useState(8)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insufficientMessage, setInsufficientMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/ai/learning-path')
      .then(r => r.json())
      .then(json => { setRemaining(json.remaining ?? 0); setCapChecked(true) })
      .catch(() => setCapChecked(true))
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!goalText.trim()) { setError('Tell us what you’re trying to achieve.'); return }

    // ChipMultiSelect manages its own selection state internally and only
    // exposes it via hidden <input> fields for native form submission —
    // reading it through FormData here instead of lifting its state up.
    const topicNames = new FormData(e.currentTarget).getAll('topics') as string[]

    setSubmitting(true)
    setError(null)
    setInsufficientMessage(null)

    try {
      const res = await fetch('/api/ai/learning-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalText, roleId: null, roleName: roleName || null, level: level || null,
          existingSkills: skills.split(',').map(s => s.trim()).filter(Boolean),
          weeklyMinutes, topicNames, targetTimelineWeeks,
        }),
      })
      const json = await res.json()

      if (res.status === 429 && json.monthlyLimitReached) {
        setError(json.error)
      } else if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Try again.')
      } else if (json.insufficientContent) {
        setInsufficientMessage(json.message)
      } else {
        router.push(`/dashboard/learning-paths/${json.slug}`)
        return
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (capChecked && remaining <= 0) {
    return (
      <div style={{ padding: '2rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.75rem' }}>
        <p className="text-body-lg" style={{ color: 'var(--color-ink-deep)', fontWeight: 700, margin: '0 0 0.5rem' }}>You&apos;ve used all 3 custom learning paths this month</p>
        <p className="text-body-md" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          You can create up to 3 custom learning paths per month. Come back next month to create another one.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="settings-form">
      <div className="settings-field">
        <label htmlFor="goalText">What are you trying to achieve?</label>
        <textarea id="goalText" value={goalText} onChange={e => setGoalText(e.target.value)} rows={3} placeholder="e.g. Move from associate PM to senior PM in the next 3 months" required />
      </div>

      <div className="settings-field">
        <label htmlFor="roleName">Current role</label>
        <input id="roleName" value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="Product Manager" />
      </div>

      <div className="settings-field">
        <label htmlFor="level">Current experience level</label>
        <select id="level" value={level} onChange={e => setLevel(e.target.value)}>
          <option value="">Select…</option>
          {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>

      <div className="settings-field">
        <label htmlFor="skills">Existing skills (comma separated)</label>
        <input id="skills" value={skills} onChange={e => setSkills(e.target.value)} placeholder="Roadmapping, SQL, User Research" />
      </div>

      <div className="settings-field">
        <label htmlFor="weeklyMinutes">Weekly time commitment (minutes)</label>
        <input id="weeklyMinutes" type="number" min={30} max={1200} step={15} value={weeklyMinutes} onChange={e => setWeeklyMinutes(Number(e.target.value))} />
      </div>

      <div className="settings-field">
        <label>Priority areas</label>
        <ChipMultiSelect name="topics" options={initial.topicOptions} initial={initial.initialTopics} />
      </div>

      <div className="settings-field">
        <label htmlFor="targetTimelineWeeks">Target timeline (weeks)</label>
        <input id="targetTimelineWeeks" type="number" min={1} max={52} value={targetTimelineWeeks} onChange={e => setTargetTimelineWeeks(Number(e.target.value))} />
      </div>

      {insufficientMessage && (
        <div style={{ padding: '1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          <p className="text-body-sm" style={{ color: 'var(--color-ink-deep)', margin: 0 }}>{insufficientMessage}</p>
        </div>
      )}

      <div className="settings-actions">
        <button type="submit" disabled={submitting} className="btn-save">
          {submitting ? 'Building your path… (this can take up to 30 seconds)' : 'Create My Learning Path'}
        </button>
        {error && <span className="save-msg err">{error}</span>}
      </div>
    </form>
  )
}
