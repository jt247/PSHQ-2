import { useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { supabase } from '@/lib/supabase'

interface ContentRow {
  id: string
  title: string
  slug: string
  type: string
  summary: string | null
  domain: string | null
  file_url: string | null
}

const TYPES = ['all', 'article', 'ebook', 'template', 'guide', 'build_note'] as const
const TYPE_LABELS: Record<string, string> = { all: 'All', article: 'Articles', ebook: 'Ebooks', template: 'Templates', guide: 'Guides', build_note: 'Build Notes' }

// Articles/Build Notes have a native in-app reader; ebooks/templates/guides
// route to /content/[slug] (Epic I — real in-app detail screen with
// favorite/AI/offline-download, replacing the old direct-to-external-viewer
// link that was Step 0's biggest MVP gap finding).
function itemAction(item: ContentRow): { kind: 'route'; href: string } | null {
  if (item.type === 'article') return { kind: 'route', href: `/articles/${item.slug}` }
  if (item.type === 'build_note') return { kind: 'route', href: `/build-notes/${item.slug}` }
  if (item.file_url) return { kind: 'route', href: `/content/${item.slug}` }
  return null
}

export default function LibraryScreen() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ContentRow[]>([])
  const [type, setType] = useState<typeof TYPES[number]>('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase.from('content').select('id, title, slug, type, summary, domain, file_url').eq('status', 'published').order('published_at', { ascending: false })
      if (type !== 'all') query = query.eq('type', type)
      const { data } = await query
      setItems((data ?? []) as ContentRow[])
      setLoading(false)
    }
    load()
  }, [type])

  function handlePress(item: ContentRow) {
    const action = itemAction(item)
    if (action) router.push(action.href as never)
  }

  return (
    <ThemedView style={styles.flex}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>Library</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {TYPES.map(t => (
            <Pressable key={t} onPress={() => setType(t)} style={[styles.chip, type === t && styles.chipActive]}>
              <ThemedText style={type === t ? styles.chipTextActive : styles.chipText}>{TYPE_LABELS[t]}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </ThemedView>

      {loading ? (
        <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<ThemedText style={styles.empty}>Nothing here yet.</ThemedText>}
          renderItem={({ item }) => {
            const action = itemAction(item)
            return (
              <Pressable
                onPress={() => handlePress(item)}
                disabled={!action}
                style={[styles.card, !action && styles.cardDisabled]}
              >
                <ThemedText type="smallBold" style={styles.cardType}>{TYPE_LABELS[item.type] ?? item.type}</ThemedText>
                <ThemedText type="default" style={styles.cardTitle}>{item.title}</ThemedText>
                {item.summary && <ThemedText type="small" style={styles.cardSummary}>{item.summary}</ThemedText>}
                {!action && <ThemedText type="small" style={styles.comingSoon}>No file attached yet</ThemedText>}
              </Pressable>
            )
          }}
        />
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, marginBottom: 12 },
  chipRow: { gap: 8, paddingBottom: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db' },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { fontSize: 13 },
  chipTextActive: { fontSize: 13, color: '#fff' },
  list: { padding: 20, gap: 12 },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 16 },
  cardDisabled: { opacity: 0.6 },
  cardType: { opacity: 0.5, marginBottom: 4, fontSize: 11, textTransform: 'uppercase' },
  cardTitle: { fontWeight: '700', marginBottom: 4 },
  cardSummary: { opacity: 0.7 },
  openHint: { marginTop: 6, opacity: 0.6 },
  comingSoon: { marginTop: 6, opacity: 0.5, fontStyle: 'italic' },
  empty: { textAlign: 'center', opacity: 0.6, marginTop: 40 },
})
