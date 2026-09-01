import { useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { router, Stack } from 'expo-router'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { supabase } from '@/lib/supabase'

interface Collection { id: string; slug: string; title: string; description: string | null }

export default function CollectionsListScreen() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Collection[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('collections').select('id, slug, title, description').eq('status', 'published').order('display_order')
      setItems((data ?? []) as Collection[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Collections', headerShown: true }} />
      {loading ? (
        <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/collections/${item.slug}` as never)} style={styles.card}>
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
  cardTitle: { marginBottom: 4 },
  cardDescription: { opacity: 0.7 },
})
