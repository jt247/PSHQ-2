import { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, ActivityIndicator, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { trackContentOpened } from '@pshq/analytics'
import { retrieveContinueFromHere, type ContinueFromHereItem } from '@pshq/api-client/ai'
import { toggleContentComplete } from '@pshq/api-client/content-actions'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { AiAssistantButton } from '@/components/ai-assistant-panel'
import { ContentRow } from '@/components/content-row'
import { CommentsAndRating } from '@/components/comments-and-rating'
import { ReaderControls } from '@/components/reader-controls'
import { useReaderFontScale } from '@/hooks/use-reader-font-scale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

interface Article { id: string; title: string; summary: string | null; body: string | null; domain: string | null; tags: string[] | null; series_id: string | null }

export default function ArticleReaderScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [item, setItem] = useState<Article | null>(null)
  const [continueFromHere, setContinueFromHere] = useState<ContinueFromHereItem[]>([])
  const [initialFavorited, setInitialFavorited] = useState(false)
  const [initialComplete, setInitialComplete] = useState(false)
  const { scale } = useReaderFontScale()
  const autoCompletedRef = useRef(false)

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

        if (user) {
          const [{ data: fav }, { data: progress }] = await Promise.all([
            supabase.from('content_favorites').select('content_id').eq('content_id', data.id).eq('user_id', user.id).maybeSingle(),
            supabase.from('content_progress').select('status').eq('content_id', data.id).eq('user_id', user.id).maybeSingle(),
          ])
          setInitialFavorited(!!fav)
          setInitialComplete(progress?.status === 'completed')
          autoCompletedRef.current = progress?.status === 'completed'
        }
      }
      setLoading(false)
    }
    load()
  }, [slug])

  // Epic I §I.4 reading progress — mirrors web's scroll/dwell
  // AutoCompleteTracker: reaching the bottom of the article marks it
  // complete automatically, once, without waiting for the manual button.
  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (autoCompletedRef.current || !session?.user.id || !item) return
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y
    if (distanceFromBottom < 80) {
      autoCompletedRef.current = true
      toggleContentComplete(supabase, 'mobile', session.user.id, item.id, true, true)
    }
  }

  if (loading || !item) return <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: item.title, headerShown: true }} />
      <ScrollView contentContainerStyle={styles.container} onScroll={handleScroll} scrollEventThrottle={400}>
        <ThemedText type="title" style={styles.title}>{item.title}</ThemedText>
        {item.summary && <ThemedText type="default" style={styles.summary}>{item.summary}</ThemedText>}

        <AiAssistantButton contentId={item.id} />

        <ReaderControls
          contentId={item.id}
          shareTitle={item.title}
          listenText={item.body ?? undefined}
          initialFavorited={initialFavorited}
          initialComplete={initialComplete}
        />

        {(item.body ?? '').split(/\n\n+/).filter(Boolean).map((p, i) => (
          <ThemedText key={i} type="default" style={[styles.paragraph, { fontSize: 15 * scale, lineHeight: 22 * scale }]}>{p.trim()}</ThemedText>
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
