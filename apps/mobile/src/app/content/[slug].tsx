import { useEffect, useState } from 'react'
import { ScrollView, View, Pressable, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { File, Directory, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { trackContentImpression, trackContentOpened, trackResourceDownloaded, trackEbookDownloadedOffline } from '@pshq/analytics'
import { retrieveContinueFromHere, type ContinueFromHereItem } from '@pshq/api-client/ai'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { AiAssistantButton } from '@/components/ai-assistant-panel'
import { ContentRow } from '@/components/content-row'
import { CommentsAndRating } from '@/components/comments-and-rating'
import { ReaderControls } from '@/components/reader-controls'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { callApi } from '@/lib/api'

interface ContentItem {
  id: string; title: string; summary: string | null; type: string
  file_url: string | null; domain: string | null; tags: string[] | null; series_id: string | null
}

const OFFLINE_DIR = new Directory(Paths.document, 'offline-ebooks')

function localFileFor(contentId: string): File {
  return new File(OFFLINE_DIR, `${contentId}.pdf`)
}

// Epic I Step 1/3/4 — the real gap Step 0 found: ebooks/templates had no
// in-app screen at all, just an external file link. This gives them the
// same favorite/share/mark-complete/AI/related-content/comments treatment
// articles already had (via the shared ReaderControls), plus the one thing
// genuinely new to this epic: an on-device offline copy (§I.5). No Listen
// control here — a PDF has no extractable text to speak, so Step 3's
// instruction to flag a real gap honestly applies: this screen simply
// doesn't render that button, rather than a disabled fake one.
export default function ContentDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [item, setItem] = useState<ContentItem | null>(null)
  const [continueFromHere, setContinueFromHere] = useState<ContinueFromHereItem[]>([])
  const [initialFavorited, setInitialFavorited] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('content')
        .select('id, title, summary, type, file_url, domain, tags, series_id')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()
      const row = data as ContentItem | null
      setItem(row)
      if (row) {
        const { data: { user } } = await supabase.auth.getUser()
        const contentType = row.type === 'ebook' ? 'ebook' : row.type === 'template' ? 'template' : row.type === 'course' ? 'course' : undefined
        await trackContentImpression({ supabase, source: 'mobile', userId: user?.id ?? null }, { contentId: row.id, contentType })
        await trackContentOpened({ supabase, source: 'mobile', userId: user?.id ?? null }, { contentId: row.id, contentType })

        const items = await retrieveContinueFromHere(supabase, {
          contentId: row.id, domain: row.domain, tags: row.tags ?? [], seriesId: row.series_id,
        })
        setContinueFromHere(items)

        setDownloaded(localFileFor(row.id).exists)

        if (user) {
          const { data: fav } = await supabase.from('content_favorites').select('content_id').eq('content_id', row.id).eq('user_id', user.id).maybeSingle()
          setInitialFavorited(!!fav)
        }
      }
      setLoading(false)
    }
    load()
  }, [slug])

  // Real bug fixed live: this screen used to open/download content.file_url
  // directly — the raw, unsigned R2 object URL. The bucket is private, so
  // that failed 100% of the time with a Cloudflare "InvalidArgumentAuthorization"
  // error, not intermittently. /api/download now hands mobile back a real
  // signed URL as JSON (same signing logic web's download button already
  // used, just reached over Bearer auth instead of cookies).
  async function getSignedFileUrl(): Promise<string | null> {
    if (!item) return null
    try {
      const res = await callApi(`/api/download/${item.id}`)
      if (!res.ok) return null
      const json = await res.json()
      return json.url ?? null
    } catch {
      return null
    }
  }

  async function handleDownloadOffline() {
    if (!item || downloading) return
    setDownloading(true)
    try {
      const signedUrl = await getSignedFileUrl()
      if (!signedUrl) throw new Error('Could not get a download link.')
      if (!OFFLINE_DIR.exists) OFFLINE_DIR.create({ intermediates: true })
      const dest = localFileFor(item.id)
      // Downloading straight to `dest` (a File, not a Directory) keeps our
      // stable content-id filename regardless of what the URL is named.
      await File.downloadFileAsync(signedUrl, dest, { idempotent: true })
      setDownloaded(true)
      await trackEbookDownloadedOffline({ supabase, source: 'mobile', userId: session?.user.id ?? null }, { contentId: item.id, contentType: item.type === 'ebook' ? 'ebook' : 'template' })
    } catch {
      Alert.alert('Download failed', 'Could not save this file for offline reading. Check your connection and try again.')
    } finally {
      setDownloading(false)
    }
  }

  async function handleRemoveDownload() {
    if (!item) return
    const file = localFileFor(item.id)
    if (file.exists) file.delete()
    setDownloaded(false)
  }

  async function handleOpen() {
    if (!item) return
    const file = localFileFor(item.id)
    if (downloaded && file.exists) {
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) { await Sharing.shareAsync(file.uri, { dialogTitle: item.title }); return }
    }
    const signedUrl = await getSignedFileUrl()
    if (!signedUrl) { Alert.alert('Could not open file', 'This resource could not be opened on your device.'); return }
    const canOpen = await Linking.canOpenURL(signedUrl)
    if (!canOpen) { Alert.alert('Could not open file', 'This resource could not be opened on your device.'); return }
    await trackResourceDownloaded({ supabase, source: 'mobile', userId: session?.user.id ?? null }, { contentId: item.id, contentType: item.type === 'ebook' ? 'ebook' : 'template' })
    await Linking.openURL(signedUrl)
  }

  if (loading || !item) return <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: item.title, headerShown: true }} />
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="smallBold" style={styles.typeLabel}>{item.type}</ThemedText>
        <ThemedText type="title" style={styles.title}>{item.title}</ThemedText>
        {item.summary && <ThemedText type="default" style={styles.summary}>{item.summary}</ThemedText>}

        <AiAssistantButton contentId={item.id} />

        <ReaderControls
          contentId={item.id}
          shareTitle={item.title}
          initialFavorited={initialFavorited}
          showFontSize={false}
        />

        {/* Open is the primary action; "Save for offline" (download) stays
         * last in the row per live feedback — favorite/share (above), then
         * open, then offline save. */}
        <View style={styles.fileActions}>
          <Pressable style={styles.primaryButton} onPress={handleOpen}>
            <ThemedText style={styles.primaryButtonText}>{downloaded ? 'Open (saved offline)' : 'Open'}</ThemedText>
          </Pressable>
          {downloaded ? (
            <Pressable style={styles.secondaryButton} onPress={handleRemoveDownload}>
              <ThemedText style={styles.secondaryButtonText}>Remove offline copy</ThemedText>
            </Pressable>
          ) : (
            <Pressable style={styles.secondaryButton} onPress={handleDownloadOffline} disabled={downloading}>
              {downloading
                ? <ActivityIndicator />
                : <ThemedText style={styles.secondaryButtonText}>Save for offline</ThemedText>}
            </Pressable>
          )}
        </View>

        {/* Rating/comments before Continue From Here — people should be
         * able to act on the resource they're on before we push the next
         * recommendation at them (live feedback, reordered). */}
        <CommentsAndRating contentId={item.id} />

        {continueFromHere.length > 0 && (
          <>
            <ThemedText type="smallBold" style={styles.continueHeading}>Continue From Here</ThemedText>
            {continueFromHere.map(c => <ContentRow key={c.id} id={c.id} type={c.type} slug={c.slug} title={c.title} />)}
          </>
        )}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 48 },
  typeLabel: { opacity: 0.5, textTransform: 'uppercase', marginBottom: 6, fontSize: 11 },
  title: { fontSize: 22, marginBottom: 12 },
  summary: { opacity: 0.7, marginBottom: 16 },
  fileActions: { gap: 10, marginTop: 8, marginBottom: 8 },
  primaryButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  secondaryButtonText: { fontWeight: '600' },
  continueHeading: { marginTop: 24, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, fontSize: 11 },
})
