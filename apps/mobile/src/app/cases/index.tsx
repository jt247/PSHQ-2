import { useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { router, Stack } from 'expo-router'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { supabase } from '@/lib/supabase'

interface CaseRow { id: string; slug: string; title: string; company_name: string; description: string | null }

export default function CasesListScreen() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<CaseRow[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('case_library_entries').select('id, slug, title, company_name, description').eq('status', 'published').not('slug', 'is', null).order('published_at', { ascending: false })
      setItems((data ?? []) as CaseRow[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Product Cases', headerShown: true }} />
      {loading ? (
        <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/cases/${item.slug}` as never)} style={styles.card}>
              <ThemedText type="small" style={styles.company}>{item.company_name}</ThemedText>
              <ThemedText type="smallBold" style={styles.cardTitle}>{item.title}</ThemedText>
              {item.description && <ThemedText type="small" style={styles.cardDescription}>{item.description}</ThemedText>}
            </Pressable>
          )}
        />
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, gap: 12 },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 16 },
  company: { opacity: 0.6, marginBottom: 4 },
  cardTitle: { marginBottom: 4 },
  cardDescription: { opacity: 0.7 },
})
