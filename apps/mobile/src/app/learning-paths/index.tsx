import { useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { router, Stack } from 'expo-router'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { supabase } from '@/lib/supabase'

interface Path { id: string; slug: string; title: string; description: string | null; level: string | null }

export default function LearningPathsListScreen() {
  const [loading, setLoading] = useState(true)
  const [paths, setPaths] = useState<Path[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('learning_paths').select('id, slug, title, description, level').eq('status', 'published').order('display_order')
      setPaths((data ?? []) as Path[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Learning Paths', headerShown: true }} />
      {loading ? (
        <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>
      ) : (
        <FlatList
          data={paths}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/learning-paths/${item.slug}` as never)} style={styles.card}>
              {item.level && <ThemedText type="small" style={styles.level}>{item.level}</ThemedText>}
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
  level: { opacity: 0.5, marginBottom: 4, textTransform: 'capitalize' },
  cardTitle: { marginBottom: 4 },
  cardDescription: { opacity: 0.7 },
})
