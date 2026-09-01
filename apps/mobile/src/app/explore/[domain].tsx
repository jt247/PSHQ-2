import { useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams, Stack } from 'expo-router'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { supabase } from '@/lib/supabase'

interface ContentRow { id: string; title: string; slug: string; type: string; summary: string | null }

const DOMAIN_LABELS: Record<string, string> = {
  product: 'Product', growth: 'Growth', ai: 'AI', building: 'Building', careers: 'Careers', leadership: 'Leadership',
}

// Same featured mapping as the web domain hub (apps/web/.../explore/[domain]/page.tsx)
// — real, already-tagged content, never fabricated.
const FEATURED_BY_DOMAIN: Record<string, { kind: 'learning-path' | 'collection'; slug: string } | undefined> = {
  product: { kind: 'learning-path', slug: 'product-management-fundamentals' },
  ai: { kind: 'learning-path', slug: 'become-an-ai-product-manager' },
  building: { kind: 'learning-path', slug: 'build-your-first-product-with-ai' },
  growth: { kind: 'collection', slug: 'gtm-starter-pack' },
  careers: { kind: 'collection', slug: 'pm-interview-starter-kit' },
}

function itemRoute(item: ContentRow): string | null {
  if (item.type === 'article') return `/articles/${item.slug}`
  if (item.type === 'build_note') return `/build-notes/${item.slug}`
  return null
}

export default function DomainHubScreen() {
  const { domain } = useLocalSearchParams<{ domain: string }>()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ContentRow[]>([])
  const [featured, setFeatured] = useState<{ kind: string; slug: string; title: string } | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('content').select('id, title, slug, type, summary').eq('status', 'published').eq('domain', domain).order('published_at', { ascending: false })
      setItems((data ?? []) as ContentRow[])

      const feat = FEATURED_BY_DOMAIN[domain]
      if (feat) {
        const table = feat.kind === 'learning-path' ? 'learning_paths' : 'collections'
        const { data: featData } = await supabase.from(table).select('slug, title').eq('slug', feat.slug).maybeSingle()
        if (featData) setFeatured({ kind: feat.kind, slug: featData.slug, title: featData.title })
      }
      setLoading(false)
    }
    load()
  }, [domain])

  if (loading) return <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: DOMAIN_LABELS[domain] ?? domain, headerShown: true }} />
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={featured ? (
          <Pressable
            onPress={() => router.push(`/${featured.kind === 'learning-path' ? 'learning-paths' : 'collections'}/${featured.slug}` as never)}
            style={styles.featured}
          >
            <ThemedText type="small" style={styles.featuredLabel}>{featured.kind === 'learning-path' ? 'Featured Learning Path' : 'Featured Collection'}</ThemedText>
            <ThemedText type="smallBold" style={styles.featuredTitle}>{featured.title}</ThemedText>
          </Pressable>
        ) : null}
        ListEmptyComponent={<ThemedText style={styles.empty}>More {DOMAIN_LABELS[domain]?.toLowerCase()} resources are on the way.</ThemedText>}
        renderItem={({ item }) => {
          const route = itemRoute(item)
          return (
            <Pressable onPress={() => route && router.push(route as never)} disabled={!route} style={[styles.card, !route && styles.cardDisabled]}>
              <ThemedText type="small" style={styles.cardType}>{item.type}</ThemedText>
              <ThemedText type="smallBold" style={styles.cardTitle}>{item.title}</ThemedText>
              {item.summary && <ThemedText type="small" style={styles.cardSummary}>{item.summary}</ThemedText>}
            </Pressable>
          )
        }}
      />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, gap: 12 },
  featured: { backgroundColor: '#111827', borderRadius: 10, padding: 16, marginBottom: 16 },
  featuredLabel: { color: '#FACC15', opacity: 0.9, marginBottom: 4, textTransform: 'uppercase' },
  featuredTitle: { color: '#fff' },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 16, marginBottom: 12 },
  cardDisabled: { opacity: 0.6 },
  cardType: { opacity: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  cardTitle: { marginBottom: 4 },
  cardSummary: { opacity: 0.7 },
  empty: { textAlign: 'center', opacity: 0.6, marginTop: 40 },
})
