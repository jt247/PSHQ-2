import { useEffect, useState } from 'react'
import { FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { trackContentOpened } from '@pshq/analytics'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { supabase } from '@/lib/supabase'

interface Item { title: string; type: string; summary: string | null }

export default function CollectionDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState<string | null>(null)
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('collections')
        .select('id, title, description, collection_items (display_order, content:content_id (title, type, summary))')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()
      if (data) {
        setTitle(data.title)
        setDescription(data.description)
        const rows = ((data.collection_items ?? []) as unknown as { display_order: number; content: Item }[])
          .slice().sort((a, b) => a.display_order - b.display_order).map(r => r.content)
        setItems(rows)
        const { data: { user } } = await supabase.auth.getUser()
        await trackContentOpened({ supabase, source: 'mobile', userId: user?.id ?? null }, { contentId: data.id, contentType: 'article' })
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title, headerShown: true }} />
      <FlatList
        data={items}
        keyExtractor={(i, idx) => `${i.title}-${idx}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={description ? <ThemedText type="default" style={styles.description}>{description}</ThemedText> : null}
        renderItem={({ item }) => (
          <ThemedView style={styles.card}>
            <ThemedText type="small" style={styles.type}>{item.type}</ThemedText>
            <ThemedText type="smallBold" style={styles.cardTitle}>{item.title}</ThemedText>
            {item.summary && <ThemedText type="small" style={styles.cardSummary}>{item.summary}</ThemedText>}
          </ThemedView>
        )}
      />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, gap: 12 },
  description: { opacity: 0.75, marginBottom: 12 },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 16 },
  type: { opacity: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  cardTitle: { marginBottom: 4 },
  cardSummary: { opacity: 0.7 },
})
