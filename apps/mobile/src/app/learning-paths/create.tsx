import { useEffect, useState } from 'react'
import { ScrollView, View, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { router, Stack } from 'expo-router'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { ThemedTextInput } from '@/components/themed-text-input'
import { ChipMultiSelect, ChipSingleSelect } from '@/components/chip-select'
import { supabase } from '@/lib/supabase'
import { callApi } from '@/lib/api'

const EXPERIENCE_LEVELS = ['exploring', 'beginner', 'intermediate', 'senior', 'leader'] as const
const LEVEL_LABELS: Record<string, string> = {
  exploring: 'Exploring the field', beginner: 'Beginner (0-2y)', intermediate: 'Intermediate (2-5y)', senior: 'Senior (5-10y)', leader: 'Leader (10y+)',
}

// Epic E §E.1-E.3 mobile parity — same 7-field intake as web's
// CreatePathForm, hitting the same /api/ai/learning-path route via
// callApi's Bearer-token auth. Functionally complete, not pixel-polished
// (per the build prompt's own mobile bar for this epic).
export default function CreateLearningPathScreen() {
  const [loading, setLoading] = useState(true)
  const [remaining, setRemaining] = useState(3)
  const [topicOptions, setTopicOptions] = useState<string[]>([])

  const [goalText, setGoalText] = useState('')
  const [roleName, setRoleName] = useState('')
  const [level, setLevel] = useState<string | null>(null)
  const [skills, setSkills] = useState('')
  const [weeklyMinutes, setWeeklyMinutes] = useState('120')
  const [topics, setTopics] = useState<string[]>([])
  const [targetTimelineWeeks, setTargetTimelineWeeks] = useState('8')
  const [submitting, setSubmitting] = useState(false)
  const [insufficientMessage, setInsufficientMessage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profile }, { data: allTopics }, { data: userTopics }, capRes] = await Promise.all([
        supabase.from('users').select('experience_level, skills, job_role').eq('id', user.id).single(),
        supabase.from('topics').select('name').order('sort_order'),
        supabase.from('user_topics').select('topic:topics(name)').eq('user_id', user.id),
        callApi('/api/ai/learning-path').then(r => r.json()).catch(() => ({ remaining: 3 })),
      ])

      if (profile) {
        setLevel((profile as { experience_level: string | null }).experience_level ?? null)
        setSkills(((profile as { skills: string[] | null }).skills ?? []).join(', '))
        setRoleName((profile as { job_role: string | null }).job_role ?? '')
      }
      setTopicOptions((allTopics ?? []).map(t => t.name))
      setTopics(((userTopics ?? []) as unknown as Array<{ topic: { name: string } | null }>).map(t => t.topic?.name).filter((n): n is string => !!n))
      setRemaining(capRes.remaining ?? 3)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit() {
    if (!goalText.trim()) { Alert.alert('Tell us what you\'re trying to achieve.'); return }
    setSubmitting(true)
    setInsufficientMessage(null)

    try {
      const res = await callApi('/api/ai/learning-path', {
        method: 'POST',
        body: JSON.stringify({
          goalText, roleId: null, roleName: roleName || null, level,
          existingSkills: skills.split(',').map(s => s.trim()).filter(Boolean),
          weeklyMinutes: Number(weeklyMinutes) || 120, topicNames: topics,
          targetTimelineWeeks: Number(targetTimelineWeeks) || 8,
        }),
      })
      const json = await res.json()

      if (res.status === 429 && json.monthlyLimitReached) {
        Alert.alert('Monthly limit reached', json.error)
      } else if (!res.ok) {
        Alert.alert('Something went wrong', json.error ?? 'Try again.')
      } else if (json.insufficientContent) {
        setInsufficientMessage(json.message)
      } else {
        router.replace(`/learning-paths/mine/${json.slug}` as never)
        return
      }
    } catch {
      Alert.alert('Something went wrong', 'Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>

  if (remaining <= 0) {
    return (
      <ThemedView style={styles.center}>
        <Stack.Screen options={{ title: 'Create My Learning Path', headerShown: true }} />
        <ThemedText type="default" style={{ textAlign: 'center', paddingHorizontal: 24 }}>
          You&apos;ve used all 3 custom learning paths this month. Come back next month to create another.
        </ThemedText>
      </ThemedView>
    )
  }

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Create My Learning Path', headerShown: true }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Field label="What are you trying to achieve?">
          <ThemedTextInput style={[styles.input, styles.multiline]} value={goalText} onChangeText={setGoalText} multiline numberOfLines={3} placeholder="e.g. Move from associate PM to senior PM" />
        </Field>
        <Field label="Current role">
          <ThemedTextInput style={styles.input} value={roleName} onChangeText={setRoleName} placeholder="Product Manager" />
        </Field>
        <Field label="Current experience level">
          <ChipSingleSelect options={EXPERIENCE_LEVELS} value={level} onChange={setLevel} labels={LEVEL_LABELS} />
        </Field>
        <Field label="Existing skills (comma separated)">
          <ThemedTextInput style={styles.input} value={skills} onChangeText={setSkills} placeholder="Roadmapping, SQL, User Research" />
        </Field>
        <Field label="Weekly time commitment (minutes)">
          <ThemedTextInput style={styles.input} value={weeklyMinutes} onChangeText={setWeeklyMinutes} keyboardType="number-pad" />
        </Field>
        <Field label="Priority areas">
          <ChipMultiSelect options={topicOptions} value={topics} onChange={setTopics} />
        </Field>
        <Field label="Target timeline (weeks)">
          <ThemedTextInput style={styles.input} value={targetTimelineWeeks} onChangeText={setTargetTimelineWeeks} keyboardType="number-pad" />
        </Field>

        {insufficientMessage && (
          <View style={styles.noticeBox}>
            <ThemedText type="small">{insufficientMessage}</ThemedText>
          </View>
        )}

        <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          <ThemedText style={styles.submitButtonText}>
            {submitting ? 'Building your path… (up to 30s)' : 'Create My Learning Path'}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={styles.label}>{label}</ThemedText>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 60 },
  field: { marginBottom: 16 },
  label: { marginBottom: 6, opacity: 0.7 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 15 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  noticeBox: { padding: 12, backgroundColor: '#fffbeb', borderRadius: 8, marginBottom: 16 },
  submitButton: { backgroundColor: '#111827', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontWeight: '700' },
})
