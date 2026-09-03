import { useState } from 'react'
import { ScrollView, View, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { Stack, router } from 'expo-router'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { ThemedTextInput } from '@/components/themed-text-input'
import { callApi } from '@/lib/api'

const CATEGORIES = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_suggestion', label: 'Feature suggestion' },
  { value: 'content_request', label: 'Content request' },
  { value: 'something_confusing', label: 'Something confusing' },
  { value: 'something_liked', label: 'Something I liked' },
  { value: 'account_support', label: 'Account / support issue' },
  { value: 'other', label: 'Other' },
] as const

// Epic I Step 1 — mobile never had web's Epic G §G.10 "Give Feedback"
// entry point at all. Hits the same /api/feedback route web uses (already
// Bearer-token capable via getAuthedRequestUser — no changes needed there,
// this is the shared-logic pattern working as intended).
export default function FeedbackScreen() {
  const [category, setCategory] = useState<typeof CATEGORIES[number]['value']>('bug')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit() {
    if (!message.trim()) { setError('Please describe what happened.'); return }
    setError(null)
    setPending(true)
    try {
      const res = await callApi('/api/feedback', { method: 'POST', body: JSON.stringify({ category, message: message.trim() }) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to submit.')
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setPending(false)
    }
  }

  if (submitted) {
    return (
      <ThemedView style={styles.center}>
        <Stack.Screen options={{ title: 'Feedback', headerShown: true }} />
        <ThemedText type="title" style={styles.thanksTitle}>Thanks for the feedback</ThemedText>
        <ThemedText type="default" style={styles.thanksBody}>
          We read every submission. If it needs a reply, we&apos;ll reach you at your account email.
        </ThemedText>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <ThemedText style={styles.buttonText}>Done</ThemedText>
        </Pressable>
      </ThemedView>
    )
  }

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Give Feedback', headerShown: true }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <ThemedText type="default" style={styles.intro}>
            Found a bug, have an idea, or something confused you? Tell us here.
          </ThemedText>

          <ThemedText type="smallBold" style={styles.label}>Category</ThemedText>
          <View style={styles.chipRow}>
            {CATEGORIES.map(c => (
              <Pressable key={c.value} onPress={() => setCategory(c.value)} style={[styles.chip, category === c.value && styles.chipActive]}>
                <ThemedText style={category === c.value ? styles.chipTextActive : styles.chipText}>{c.label}</ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="smallBold" style={styles.label}>What&apos;s on your mind?</ThemedText>
          <ThemedTextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us what happened, or what you'd like to see…"
            multiline
            maxLength={4000}
          />

          {error && <ThemedText type="small" style={styles.error}>{error}</ThemedText>}

          <Pressable style={[styles.button, pending && styles.buttonDisabled]} onPress={handleSubmit} disabled={pending}>
            <ThemedText style={styles.buttonText}>{pending ? 'Sending…' : 'Send Feedback →'}</ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  container: { padding: 20, gap: 8, paddingBottom: 48 },
  intro: { opacity: 0.7, marginBottom: 12 },
  label: { marginTop: 16, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db' },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { fontSize: 13 },
  chipTextActive: { fontSize: 13, color: '#fff' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, minHeight: 120, textAlignVertical: 'top', fontSize: 15 },
  error: { color: '#dc2626', marginTop: 8 },
  button: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  thanksTitle: { textAlign: 'center', marginBottom: 8 },
  thanksBody: { textAlign: 'center', opacity: 0.7, marginBottom: 12 },
})
