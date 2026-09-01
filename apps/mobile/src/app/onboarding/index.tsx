import { useEffect, useState } from 'react'
import { ScrollView, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import {
  PRIMARY_ROLES, GOALS, TOPICS, EXPERIENCE_LEVELS, EXPERIENCE_LEVEL_LABELS, MAX_GOALS,
} from '@pshq/api-client/onboarding'
import { trackOnboardingStarted, trackOnboardingStepCompleted, trackOnboardingCompleted } from '@pshq/analytics'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { ChipSingleSelect, ChipMultiSelect } from '@/components/chip-select'
import { supabase } from '@/lib/supabase'

type Step = 'about_you' | 'role' | 'experience' | 'goals' | 'topics'
const STEPS: Step[] = ['about_you', 'role', 'experience', 'goals', 'topics']
const STEP_LABELS: Record<Step, string> = {
  about_you: 'About You', role: 'Role', experience: 'Experience', goals: 'Goals', topics: 'Topics',
}

interface FormValues {
  jobRole: string
  company: string
  country: string
  region: string
  headline: string
  primaryRole: string | null
  secondaryRoles: string[]
  experienceLevel: string | null
  goals: string[]
  topics: string[]
}

const EMPTY: FormValues = {
  jobRole: '', company: '', country: '', region: '', headline: '',
  primaryRole: null, secondaryRoles: [], experienceLevel: null, goals: [], topics: [],
}

// Same resume rule as web (apps/web/src/app/onboarding/page.tsx): first
// *_completed_at still null, in order, is where the user resumes.
function firstIncompleteStep(progress: Record<string, unknown> | null): Step {
  if (!progress) return 'about_you'
  if (!progress.about_you_completed_at) return 'about_you'
  if (!progress.role_completed_at) return 'role'
  if (!progress.experience_completed_at) return 'experience'
  if (!progress.goals_completed_at) return 'goals'
  return 'topics'
}

export default function OnboardingScreen() {
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('about_you')
  const [values, setValues] = useState<FormValues>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/sign-in'); return }
      setUserId(user.id)

      const [profileRes, progressRes, secondaryRes, goalsRes, topicsRes, primaryRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('onboarding_progress').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_secondary_roles').select('role:roles(name)').eq('user_id', user.id),
        supabase.from('user_goals').select('goal:goals(name)').eq('user_id', user.id),
        supabase.from('user_topics').select('topic:topics(name)').eq('user_id', user.id),
        supabase.from('users').select('primary_role_id, roles:primary_role_id(name)').eq('id', user.id).single(),
      ])

      const profile = profileRes.data as Record<string, unknown> | null
      const progress = progressRes.data as Record<string, unknown> | null
      const primaryRoleName = (primaryRes.data as unknown as { roles: { name: string } | null } | null)?.roles?.name ?? null
      const secondaryNames = ((secondaryRes.data ?? []) as unknown as Array<{ role: { name: string } | null }>)
        .map(r => r.role?.name).filter((n): n is string => !!n)
      const goalNames = ((goalsRes.data ?? []) as unknown as Array<{ goal: { name: string } | null }>)
        .map(g => g.goal?.name).filter((n): n is string => !!n)
      const topicNames = ((topicsRes.data ?? []) as unknown as Array<{ topic: { name: string } | null }>)
        .map(t => t.topic?.name).filter((n): n is string => !!n)

      setValues({
        jobRole: (profile?.job_role as string) ?? '',
        company: (profile?.company as string) ?? '',
        country: (profile?.country as string) ?? '',
        region: (profile?.region as string) ?? '',
        headline: (profile?.headline as string) ?? '',
        primaryRole: primaryRoleName,
        secondaryRoles: secondaryNames,
        experienceLevel: (profile?.experience_level as string) ?? null,
        goals: goalNames,
        topics: topicNames,
      })
      setStep(firstIncompleteStep(progress))
      setLoading(false)
    }
    load()
  }, [])

  async function ensureProgressRow(uid: string) {
    const { data: existing } = await supabase.from('onboarding_progress').select('user_id').eq('user_id', uid).maybeSingle()
    if (existing) return
    await supabase.from('onboarding_progress').insert({ user_id: uid })
    await trackOnboardingStarted({ supabase, source: 'mobile', userId: uid })
  }

  async function markStepDone(uid: string, column: string, step_: string) {
    await supabase.from('onboarding_progress').update({ [column]: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', uid)
    await trackOnboardingStepCompleted({ supabase, source: 'mobile', userId: uid }, step_)
  }

  async function handleContinue() {
    if (!userId) return
    setError(null)

    if (step === 'about_you') {
      if (!values.jobRole.trim() || !values.country.trim()) { setError('Current job title and country are required.'); return }
      setSaving(true)
      await ensureProgressRow(userId)
      const { error: err } = await supabase.from('users').update({
        job_role: values.jobRole.trim(),
        company: values.company.trim() || null,
        country: values.country.trim(),
        region: values.region.trim() || null,
        headline: values.headline.trim() || null,
      }).eq('id', userId)
      setSaving(false)
      if (err) { setError(err.message); return }
      await markStepDone(userId, 'about_you_completed_at', 'about_you')
      setStep('role')
      return
    }

    if (step === 'role') {
      if (!values.primaryRole || !PRIMARY_ROLES.includes(values.primaryRole as typeof PRIMARY_ROLES[number])) {
        setError('Select a primary role.'); return
      }
      setSaving(true)
      const names = [values.primaryRole, ...values.secondaryRoles]
      const { data: roles } = await supabase.from('roles').select('id, name').in('name', names)
      const roleIdByName = new Map((roles ?? []).map((r: { id: string; name: string }) => [r.name, r.id]))
      const primaryRoleId = roleIdByName.get(values.primaryRole)
      if (!primaryRoleId) { setSaving(false); setError('Role list is out of sync — try again.'); return }

      const { error: err } = await supabase.from('users').update({ primary_role_id: primaryRoleId }).eq('id', userId)
      if (err) { setSaving(false); setError(err.message); return }

      await supabase.from('user_secondary_roles').delete().eq('user_id', userId)
      const rows = values.secondaryRoles
        .filter(name => name !== values.primaryRole)
        .map(name => roleIdByName.get(name))
        .filter((id): id is string => !!id)
        .map(roleId => ({ user_id: userId, role_id: roleId }))
      if (rows.length > 0) await supabase.from('user_secondary_roles').insert(rows)

      setSaving(false)
      await markStepDone(userId, 'role_completed_at', 'role')
      setStep('experience')
      return
    }

    if (step === 'experience') {
      if (!values.experienceLevel || !EXPERIENCE_LEVELS.includes(values.experienceLevel as typeof EXPERIENCE_LEVELS[number])) {
        setError('Select your experience level.'); return
      }
      setSaving(true)
      const { error: err } = await supabase.from('users').update({ experience_level: values.experienceLevel }).eq('id', userId)
      setSaving(false)
      if (err) { setError(err.message); return }
      await markStepDone(userId, 'experience_completed_at', 'experience')
      setStep('goals')
      return
    }

    if (step === 'goals') {
      if (values.goals.length === 0) { setError('Select at least one goal.'); return }
      if (values.goals.length > MAX_GOALS) { setError(`Select up to ${MAX_GOALS} goals.`); return }
      setSaving(true)
      const { data: goalRows } = await supabase.from('goals').select('id, name').in('name', values.goals)
      await supabase.from('user_goals').delete().eq('user_id', userId)
      const rows = (goalRows ?? []).map((g: { id: string }) => ({ user_id: userId, goal_id: g.id }))
      if (rows.length > 0) {
        const { error: err } = await supabase.from('user_goals').insert(rows)
        if (err) { setSaving(false); setError('Could not save goals — try again.'); return }
      }
      setSaving(false)
      await markStepDone(userId, 'goals_completed_at', 'goals')
      setStep('topics')
      return
    }

    // topics — final step
    if (values.topics.length === 0) { setError('Select at least one topic.'); return }
    setSaving(true)
    const { data: topicRows } = await supabase.from('topics').select('id, name').in('name', values.topics)
    await supabase.from('user_topics').delete().eq('user_id', userId)
    const rows = (topicRows ?? []).map((t: { id: string }) => ({ user_id: userId, topic_id: t.id }))
    if (rows.length > 0) {
      const { error: err } = await supabase.from('user_topics').insert(rows)
      if (err) { setSaving(false); setError('Could not save topics — try again.'); return }
    }

    const now = new Date().toISOString()
    await supabase.from('onboarding_progress').update({ topics_completed_at: now, completed_at: now, updated_at: now }).eq('user_id', userId)
    await supabase.from('users').update({ onboarding_done: true }).eq('id', userId)
    await trackOnboardingStepCompleted({ supabase, source: 'mobile', userId }, 'topics')
    await trackOnboardingCompleted({ supabase, source: 'mobile', userId })

    // Deliberately don't refreshProfile() here — the onboarding layout guard
    // redirects away once onboardingDone flips true, which would bounce the
    // user off the complete screen before they see it. Complete screen
    // refreshes the auth context itself when the user leaves it.
    setSaving(false)
    router.replace('/onboarding/complete')
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    )
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ThemedText type="title" style={styles.brand}>Product Slice HQ</ThemedText>

        <ThemedView style={styles.progressRow}>
          {STEPS.map((s, i) => (
            <ThemedView key={s} style={[styles.progressSegment, i <= stepIndex && styles.progressSegmentActive]} />
          ))}
        </ThemedView>
        <ThemedText type="small" style={styles.stepLabel}>Step {stepIndex + 1} of {STEPS.length} — {STEP_LABELS[step]}</ThemedText>

        {step === 'about_you' && (
          <>
            <ThemedText type="subtitle" style={styles.heading}>Tell us about yourself</ThemedText>
            <ThemedText type="small" style={styles.subheading}>We&apos;ll use this to tailor your experience and surface the most relevant content.</ThemedText>
            <Field label="Current job title" value={values.jobRole} onChangeText={t => setValues(v => ({ ...v, jobRole: t }))} placeholder="e.g. Senior Product Manager" />
            <Field label="Professional headline" value={values.headline} onChangeText={t => setValues(v => ({ ...v, headline: t }))} placeholder="e.g. Founder building AI products" />
            <Field label="Company (optional)" value={values.company} onChangeText={t => setValues(v => ({ ...v, company: t }))} />
            <Field label="Country" value={values.country} onChangeText={t => setValues(v => ({ ...v, country: t }))} placeholder="e.g. Nigeria" />
            <Field label="State / region" value={values.region} onChangeText={t => setValues(v => ({ ...v, region: t }))} placeholder="e.g. Lagos" />
          </>
        )}

        {step === 'role' && (
          <>
            <ThemedText type="subtitle" style={styles.heading}>What&apos;s your role?</ThemedText>
            <ThemedText type="smallBold" style={styles.fieldLabel}>Primary role</ThemedText>
            <ChipSingleSelect options={PRIMARY_ROLES} value={values.primaryRole} onChange={v => setValues(vs => ({ ...vs, primaryRole: v }))} />
            <ThemedText type="smallBold" style={[styles.fieldLabel, styles.mt]}>Also interested in (optional)</ThemedText>
            <ChipMultiSelect options={PRIMARY_ROLES} value={values.secondaryRoles} exclude={values.primaryRole} onChange={v => setValues(vs => ({ ...vs, secondaryRoles: v }))} />
          </>
        )}

        {step === 'experience' && (
          <>
            <ThemedText type="subtitle" style={styles.heading}>Where are you in your journey?</ThemedText>
            <ChipSingleSelect options={EXPERIENCE_LEVELS} value={values.experienceLevel} labels={EXPERIENCE_LEVEL_LABELS} onChange={v => setValues(vs => ({ ...vs, experienceLevel: v }))} />
          </>
        )}

        {step === 'goals' && (
          <>
            <ThemedText type="subtitle" style={styles.heading}>What are you here to do?</ThemedText>
            <ThemedText type="small" style={styles.subheading}>Pick up to {MAX_GOALS}.</ThemedText>
            <ChipMultiSelect options={GOALS} value={values.goals} max={MAX_GOALS} onChange={v => setValues(vs => ({ ...vs, goals: v }))} />
          </>
        )}

        {step === 'topics' && (
          <>
            <ThemedText type="subtitle" style={styles.heading}>Pick your topics</ThemedText>
            <ThemedText type="small" style={styles.subheading}>You can change these later from account settings.</ThemedText>
            <ChipMultiSelect options={TOPICS} value={values.topics} onChange={v => setValues(vs => ({ ...vs, topics: v }))} />
          </>
        )}

        {error && <ThemedText type="small" style={styles.error}>{error}</ThemedText>}

        <Pressable onPress={handleContinue} disabled={saving} style={[styles.submit, saving && styles.submitDisabled]}>
          <ThemedText style={styles.submitText}>{saving ? 'Saving…' : step === 'topics' ? 'Finish →' : 'Continue →'}</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  )
}

function Field({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (t: string) => void; placeholder?: string }) {
  return (
    <ThemedView style={styles.fieldWrap}>
      <ThemedText type="smallBold" style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9ca3af" style={styles.input} />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 24, paddingBottom: 48 },
  brand: { fontSize: 20, marginBottom: 24 },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' },
  progressSegmentActive: { backgroundColor: '#111827' },
  stepLabel: { marginBottom: 20, opacity: 0.6 },
  heading: { marginBottom: 8 },
  subheading: { marginBottom: 16, opacity: 0.7 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { marginBottom: 8 },
  mt: { marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  error: { color: '#dc2626', marginTop: 12 },
  submit: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '600' },
})
