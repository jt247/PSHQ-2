import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { trackContentOpened } from '@pshq/analytics'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { supabase } from '@/lib/supabase'

interface CaseDetail {
  id: string; title: string; company_name: string; description: string | null
  industry: string | null; country: string | null; stage: string | null
  problem: string | null; jt_analysis: string | null
  key_lessons: string[]
}

export default function CaseDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [loading, setLoading] = useState(true)
  const [item, setItem] = useState<CaseDetail | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('case_library_entries').select('*').eq('slug', slug).eq('status', 'published').maybeSingle()
      setItem(data as CaseDetail | null)
      if (data) {
        const { data: { user } } = await supabase.auth.getUser()
        await trackContentOpened({ supabase, source: 'mobile', userId: user?.id ?? null }, { contentId: data.id, contentType: 'article' })
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading || !item) return <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: item.company_name, headerShown: true }} />
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title" style={styles.title}>{item.title}</ThemedText>
        {item.description && <ThemedText type="default" style={styles.description}>{item.description}</ThemedText>}

        <ThemedView style={styles.factsRow}>
          {item.industry && <Fact label="Industry" value={item.industry} />}
          {item.country && <Fact label="Country" value={item.country} />}
          {item.stage && <Fact label="Stage" value={item.stage} />}
        </ThemedView>

        {item.problem && <Section title="Problem" body={item.problem} />}
        {item.jt_analysis && <Section title="JT's Analysis" body={item.jt_analysis} />}
        {item.key_lessons?.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>Key Lessons</ThemedText>
            {item.key_lessons.map((l, i) => <ThemedText key={i} type="small" style={styles.listItem}>{i + 1}. {l}</ThemedText>)}
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView style={styles.fact}>
      <ThemedText type="small" style={styles.factLabel}>{label}</ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </ThemedView>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <ThemedView style={styles.section}>
      <ThemedText type="smallBold" style={styles.sectionTitle}>{title}</ThemedText>
      <ThemedText type="default" style={styles.sectionBody}>{body}</ThemedText>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 22, marginBottom: 8 },
  description: { opacity: 0.75, marginBottom: 20 },
  factsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24, padding: 14, backgroundColor: '#f3f4f6', borderRadius: 10 },
  fact: { minWidth: 90 },
  factLabel: { opacity: 0.5, marginBottom: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { marginBottom: 8 },
  sectionBody: { opacity: 0.8, lineHeight: 22 },
  listItem: { opacity: 0.8, lineHeight: 22, marginBottom: 4 },
})
