import { useEffect, useState } from 'react'
import { ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { getStarterRecommendations, type StarterRecommendations } from '@pshq/api-client/recommendations'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

export default function OnboardingCompleteScreen() {
  const { refreshProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [recs, setRecs] = useState<StarterRecommendations | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/sign-in'); return }

      const { data: profile } = await supabase.from('users').select('onboarding_done, first_name').eq('id', user.id).single()
      if (!(profile as { onboarding_done?: boolean } | null)?.onboarding_done) { router.replace('/onboarding'); return }
      setFirstName((profile as { first_name?: string | null } | null)?.first_name ?? null)

      const data = await getStarterRecommendations(supabase, user.id)
      setRecs(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !recs) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    )
  }

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="smallBold" style={styles.eyebrow}>
          You&apos;re all set{firstName ? `, ${firstName}` : ''}
        </ThemedText>
        <ThemedText type="subtitle" style={styles.heading}>Your recommended starting point</ThemedText>

        {recs.primaryPath && <RecCard label="Primary Learning Path" title={recs.primaryPath.title} summary={recs.primaryPath.summary} />}

        {recs.articles.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="small" style={styles.sectionLabel}>Recommended articles</ThemedText>
            {recs.articles.map(a => (
              <ThemedText key={a.id} type="default" style={styles.articleLink}>→ {a.title}</ThemedText>
            ))}
          </ThemedView>
        )}

        {recs.template && <RecCard label="Template" title={recs.template.title} summary={recs.template.summary} />}
        {recs.collection && <RecCard label="Relevant Collection" title={recs.collection.title} summary={recs.collection.summary} />}

        {/* Reported live: landing on the Home tab (a public browse/landing
            screen) right after onboarding left a first-time user with no
            clear next step, AND the bottom tab bar itself didn't render
            until a further tap — a known Expo Router/react-native-screens
            timing issue when replace() crosses from a screen outside the
            (tabs) group into one inside it, before the new Tabs navigator
            has had a layout pass. requestAnimationFrame defers the
            navigation to the next frame, after this screen's own render
            (including refreshProfile's state update) has committed. Going
            straight to the Profile tab also means a first-time user lands
            on their own dashboard, not a page that reads like marketing
            copy. */}
        <Pressable
          onPress={async () => {
            await refreshProfile()
            requestAnimationFrame(() => router.replace('/profile'))
          }}
          style={styles.submit}
        >
          <ThemedText style={styles.submitText}>Continue Learning →</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  )
}

function RecCard({ label, title, summary }: { label: string; title: string; summary: string | null }) {
  return (
    <ThemedView style={styles.card}>
      <ThemedText type="small" style={styles.sectionLabel}>{label}</ThemedText>
      <ThemedText type="smallBold">{title}</ThemedText>
      {summary && <ThemedText type="small" style={styles.cardSummary}>{summary}</ThemedText>}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 24, paddingBottom: 48 },
  eyebrow: { color: '#b45309', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  heading: { marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionLabel: { opacity: 0.6, marginBottom: 8 },
  articleLink: { marginBottom: 8, fontWeight: '600' },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 16, marginBottom: 20 },
  cardSummary: { opacity: 0.7, marginTop: 4 },
  submit: { backgroundColor: '#3c87f7', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontWeight: '600' },
})
