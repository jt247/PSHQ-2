import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { trackContentOpened } from '@pshq/analytics'
import { retrieveContinueFromHere, type ContinueFromHereItem } from '@pshq/api-client/ai'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { AiAssistantButton } from '@/components/ai-assistant-panel'
import { ContentRow } from '@/components/content-row'
import { CommentsAndRating } from '@/components/comments-and-rating'
import { supabase } from '@/lib/supabase'

interface Article { id: string; title: string; summary: string | null; body: string | null; domain: string | null; tags: string[] | null; series_id: string | null }

export default function ArticleReaderScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [loading, setLoading] = useState(true)
  const [item, setItem] = useState<Article | null>(null)
  const [continueFromHere, setContinueFromHere] = useState<ContinueFromHereItem[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('content').select('id, title, summary, body, domain, tags, series_id').eq('slug', slug).eq('type', 'article').eq('status', 'published').maybeSingle()
      setItem(data as Article | null)
      if (data) {
        const { data: { user } } = await supabase.auth.getUser()
        await trackContentOpened({ supabase, source: 'mobile', userId: user?.id ?? null }, { contentId: data.id, contentType: 'article' })

        const items = await retrieveContinueFromHere(supabase, {
          contentId: data.id, domain: data.domain, tags: data.tags ?? [], seriesId: data.series_id,
        })
        setContinueFromHere(items)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading || !item) return <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: item.title, headerShown: true }} />
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title" style={styles.title}>{item.title}</ThemedText>
        {item.summary && <ThemedText type="default" style={styles.summary}>{item.summary}</ThemedText>}

        <AiAssistantButton contentId={item.id} />

        {(item.body ?? '').split(/\n\n+/).filter(Boolean).map((p, i) => (
          <ThemedText key={i} type="default" style={styles.paragraph}>{p.trim()}</ThemedText>
        ))}

        {continueFromHere.length > 0 && (
          <>
            <ThemedText type="smallBold" style={styles.continueHeading}>Continue From Here</ThemedText>
            {continueFromHere.map(c => <ContentRow key={c.id} id={c.id} type={c.type} slug={c.slug} title={c.title} />)}
          </>
        )}

        <CommentsAndRating contentId={item.id} />
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 22, marginBottom: 12 },
  summary: { opacity: 0.7, marginBottom: 16 },
  paragraph: { marginBottom: 16, lineHeight: 24 },
  continueHeading: { marginTop: 24, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, fontSize: 11 },
})
