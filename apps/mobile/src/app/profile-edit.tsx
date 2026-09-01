import { useEffect, useState } from 'react'
import { ScrollView, View, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { router, Stack } from 'expo-router'
import { trackProfileUpdated } from '@pshq/analytics'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { ChipMultiSelect } from '@/components/chip-select'
import { supabase } from '@/lib/supabase'

const USERNAME_RE = /^[a-z0-9_]{3,30}$/
const PRIVACY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'community', label: 'Members only' },
  { value: 'private', label: 'Private' },
] as const

interface FormState {
  username: string; first_name: string; last_name: string; headline: string
  job_role: string; company: string; country: string; region: string
  bio: string; skills: string
  linkedin_url: string; portfolio_url: string; website_url: string; github_url: string; x_url: string
  privacy_tier: 'public' | 'community' | 'private'
}

const BLANK: FormState = {
  username: '', first_name: '', last_name: '', headline: '', job_role: '', company: '',
  country: '', region: '', bio: '', skills: '',
  linkedin_url: '', portfolio_url: '', website_url: '', github_url: '', x_url: '',
  privacy_tier: 'community',
}

// Epic D §D.4/§D.5 — real profile edit form for mobile (no service role
// available here, unlike web's action — the RLS "users: self update"
// policy from migration 001 already covers exactly this, no server code
// needed on this side).
export default function ProfileEditScreen() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(BLANK)
  const [error, setError] = useState<string | null>(null)
  const [topicOptions, setTopicOptions] = useState<string[]>([])
  const [goalOptions, setGoalOptions] = useState<string[]>([])
  const [topics, setTopics] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data }, { data: allTopics }, { data: allGoals }, { data: userTopics }, { data: userGoals }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('topics').select('name').order('sort_order'),
        supabase.from('goals').select('name').order('sort_order'),
        supabase.from('user_topics').select('topic:topics(name)').eq('user_id', user.id),
        supabase.from('user_goals').select('goal:goals(name)').eq('user_id', user.id),
      ])
      setTopicOptions((allTopics ?? []).map(t => t.name))
      setGoalOptions((allGoals ?? []).map(g => g.name))
      setTopics(((userTopics ?? []) as unknown as Array<{ topic: { name: string } | null }>).map(t => t.topic?.name).filter((n): n is string => !!n))
      setGoals(((userGoals ?? []) as unknown as Array<{ goal: { name: string } | null }>).map(g => g.goal?.name).filter((n): n is string => !!n))

      if (data) {
        const row = data as Record<string, unknown>
        setForm({
          username: (row.username as string) ?? '',
          first_name: (row.first_name as string) ?? '',
          last_name: (row.last_name as string) ?? '',
          headline: (row.headline as string) ?? '',
          job_role: (row.job_role as string) ?? '',
          company: (row.company as string) ?? '',
          country: (row.country as string) ?? '',
          region: (row.region as string) ?? '',
          bio: (row.bio as string) ?? '',
          skills: ((row.skills as string[] | null) ?? []).join(', '),
          linkedin_url: (row.linkedin_url as string) ?? '',
          portfolio_url: (row.portfolio_url as string) ?? '',
          website_url: (row.website_url as string) ?? '',
          github_url: (row.github_url as string) ?? '',
          x_url: (row.x_url as string) ?? '',
          privacy_tier: ((row.privacy_tier as string) ?? 'community') as FormState['privacy_tier'],
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setError(null)
    const username = form.username.trim().toLowerCase() || null
    if (username && !USERNAME_RE.test(username)) {
      setError('Username must be 3-30 characters: lowercase letters, numbers, underscores only.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)

    const skills = form.skills ? Array.from(new Set(form.skills.split(',').map(s => s.trim()).filter(Boolean))).slice(0, 20) : []
    const full_name = [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(' ') || null

    const { error: updateError } = await supabase.from('users').update({
      username, first_name: form.first_name.trim() || null, last_name: form.last_name.trim() || null, full_name,
      headline: form.headline.trim() || null, job_role: form.job_role.trim() || null, company: form.company.trim() || null,
      country: form.country.trim() || null, region: form.region.trim() || null, bio: form.bio.trim() || null, skills,
      linkedin_url: form.linkedin_url.trim() || null, portfolio_url: form.portfolio_url.trim() || null,
      website_url: form.website_url.trim() || null, github_url: form.github_url.trim() || null, x_url: form.x_url.trim() || null,
      privacy_tier: form.privacy_tier,
    }).eq('id', user.id)

    if (updateError) {
      setSaving(false)
      setError(updateError.code === '23505' ? 'That username is already taken.' : 'Failed to save. Try again.')
      return
    }

    // Delete-then-insert-selected — same sync shape as web's settings action.
    const [{ data: allTopics }, { data: allGoals }] = await Promise.all([
      supabase.from('topics').select('id, name'),
      supabase.from('goals').select('id, name'),
    ])
    const topicIds = (allTopics ?? []).filter(t => topics.includes(t.name)).map(t => t.id)
    const goalIds = (allGoals ?? []).filter(g => goals.includes(g.name)).map(g => g.id)

    await supabase.from('user_topics').delete().eq('user_id', user.id)
    if (topicIds.length > 0) await supabase.from('user_topics').insert(topicIds.map(topic_id => ({ user_id: user.id, topic_id })))
    await supabase.from('user_goals').delete().eq('user_id', user.id)
    for (const goal_id of goalIds.slice(0, 5)) await supabase.from('user_goals').insert({ user_id: user.id, goal_id })

    setSaving(false)
    await trackProfileUpdated({ supabase, source: 'mobile', userId: user.id }, [...Object.keys(form), 'topics', 'goals'])
    Alert.alert('Saved', 'Your profile has been updated.', [{ text: 'OK', onPress: () => router.back() }])
  }

  if (loading) return <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Edit Profile', headerShown: true }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Field label="Username">
          <TextInput style={styles.input} value={form.username} onChangeText={v => set('username', v)} placeholder="ada_lovelace" autoCapitalize="none" />
        </Field>
        <Field label="First name"><TextInput style={styles.input} value={form.first_name} onChangeText={v => set('first_name', v)} /></Field>
        <Field label="Last name"><TextInput style={styles.input} value={form.last_name} onChangeText={v => set('last_name', v)} /></Field>
        <Field label="Headline"><TextInput style={styles.input} value={form.headline} onChangeText={v => set('headline', v)} placeholder="Senior PM building AI-native products" /></Field>
        <Field label="Current role"><TextInput style={styles.input} value={form.job_role} onChangeText={v => set('job_role', v)} /></Field>
        <Field label="Company"><TextInput style={styles.input} value={form.company} onChangeText={v => set('company', v)} /></Field>
        <Field label="Country"><TextInput style={styles.input} value={form.country} onChangeText={v => set('country', v)} /></Field>
        <Field label="State / region"><TextInput style={styles.input} value={form.region} onChangeText={v => set('region', v)} /></Field>
        <Field label="Bio"><TextInput style={[styles.input, styles.multiline]} value={form.bio} onChangeText={v => set('bio', v)} multiline numberOfLines={3} /></Field>
        <Field label="Skills (comma separated)"><TextInput style={styles.input} value={form.skills} onChangeText={v => set('skills', v)} /></Field>
        <Field label="LinkedIn"><TextInput style={styles.input} value={form.linkedin_url} onChangeText={v => set('linkedin_url', v)} autoCapitalize="none" keyboardType="url" /></Field>
        <Field label="Portfolio"><TextInput style={styles.input} value={form.portfolio_url} onChangeText={v => set('portfolio_url', v)} autoCapitalize="none" keyboardType="url" /></Field>
        <Field label="Website"><TextInput style={styles.input} value={form.website_url} onChangeText={v => set('website_url', v)} autoCapitalize="none" keyboardType="url" /></Field>
        <Field label="GitHub"><TextInput style={styles.input} value={form.github_url} onChangeText={v => set('github_url', v)} autoCapitalize="none" keyboardType="url" /></Field>
        <Field label="X (Twitter)"><TextInput style={styles.input} value={form.x_url} onChangeText={v => set('x_url', v)} autoCapitalize="none" keyboardType="url" /></Field>

        <Field label="Topics">
          <ChipMultiSelect options={topicOptions} value={topics} onChange={setTopics} />
        </Field>

        <Field label={`Goals (${goals.length}/5 selected)`}>
          <ChipMultiSelect options={goalOptions} value={goals} onChange={setGoals} max={5} />
        </Field>

        <ThemedText type="smallBold" style={styles.label}>Profile privacy</ThemedText>
        <View style={styles.privacyRow}>
          {PRIVACY_OPTIONS.map(opt => (
            <Pressable key={opt.value} onPress={() => set('privacy_tier', opt.value)} style={[styles.chip, form.privacy_tier === opt.value && styles.chipActive]}>
              <ThemedText style={form.privacy_tier === opt.value ? styles.chipTextActive : undefined}>{opt.label}</ThemedText>
            </Pressable>
          ))}
        </View>
        <ThemedText type="small" style={styles.hint}>Your email is never shown on your public profile, no matter which option you pick.</ThemedText>

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
          <ThemedText style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save changes'}</ThemedText>
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
  container: { padding: 20, gap: 4, paddingBottom: 60 },
  field: { marginBottom: 14 },
  label: { marginBottom: 6, opacity: 0.7 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 15 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  privacyRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db' },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipTextActive: { color: '#fff' },
  hint: { opacity: 0.5, marginBottom: 14 },
  error: { color: '#dc2626', marginBottom: 12 },
  saveButton: { backgroundColor: '#111827', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontWeight: '700' },
})
