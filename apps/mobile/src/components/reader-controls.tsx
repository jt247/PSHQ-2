import { useState } from 'react'
import { View, Pressable, StyleSheet, Share, Alert } from 'react-native'
import * as Speech from 'expo-speech'
import { ThemedText } from '@/components/themed-text'
import { toggleFavorite, toggleContentComplete, logShare } from '@pshq/api-client/content-actions'
import { trackListenStarted, trackListenCompleted } from '@pshq/analytics'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useReaderFontScale } from '@/hooks/use-reader-font-scale'

interface Props {
  contentId: string
  shareTitle: string
  shareUrl?: string
  /** Plain text to read aloud. Omit for content with no extractable text
   * (a PDF ebook/template) — Step 3 explicitly asks for an honest gap over
   * a button that looks like it works and doesn't, so no Listen control
   * renders at all rather than a disabled or fake one. */
  listenText?: string
  initialFavorited: boolean
  initialComplete: boolean
}

// Epic I §I.4 — one shared control row (font size, save, share, mark
// complete, listen) so the article reader and the new ebook screen don't
// each grow their own copy of this logic, per Standing Rule 2.
export function ReaderControls({ contentId, shareTitle, shareUrl, listenText, initialFavorited, initialComplete }: Props) {
  const { session } = useAuth()
  const { index, maxIndex, setScaleIndex } = useReaderFontScale()
  const [favorited, setFavorited] = useState(initialFavorited)
  const [complete, setComplete] = useState(initialComplete)
  const [speaking, setSpeaking] = useState(false)
  const [busy, setBusy] = useState(false)

  const userId = session?.user.id

  async function handleFavorite() {
    if (!userId || busy) return
    setBusy(true)
    const next = !favorited
    setFavorited(next) // optimistic
    const { error } = await toggleFavorite(supabase, 'mobile', userId, contentId, favorited)
    if (error) { setFavorited(!next); Alert.alert('Could not save', error) }
    setBusy(false)
  }

  async function handleComplete() {
    if (!userId || busy) return
    setBusy(true)
    const next = !complete
    setComplete(next) // optimistic
    const { error } = await toggleContentComplete(supabase, 'mobile', userId, contentId, next)
    if (error) { setComplete(!next); Alert.alert('Could not update progress', error) }
    setBusy(false)
  }

  async function handleShare() {
    try {
      await Share.share(shareUrl ? { message: shareTitle, url: shareUrl } : { message: shareTitle })
      await logShare(supabase, 'mobile', userId ?? null, contentId)
    } catch { /* user cancelled the share sheet — not an error */ }
  }

  function handleListen() {
    if (!listenText) return
    if (speaking) {
      Speech.stop()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    if (userId) trackListenStarted({ supabase, source: 'mobile', userId }, { contentId })
    Speech.speak(listenText, {
      onDone: () => { setSpeaking(false); if (userId) trackListenCompleted({ supabase, source: 'mobile', userId }, { contentId }) },
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    })
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ActionButton label={favorited ? '★ Saved' : '☆ Save'} active={favorited} onPress={handleFavorite} disabled={!userId} />
        <ActionButton label="Share" onPress={handleShare} />
        <ActionButton label={complete ? '✓ Complete' : 'Mark Complete'} active={complete} onPress={handleComplete} disabled={!userId} />
        {listenText && <ActionButton label={speaking ? '⏸ Stop' : '🔊 Listen'} active={speaking} onPress={handleListen} />}
      </View>

      <View style={styles.fontRow}>
        <ThemedText type="small" style={styles.fontLabel}>Text size</ThemedText>
        <Pressable onPress={() => setScaleIndex(index - 1)} disabled={index === 0} style={styles.fontButton}>
          <ThemedText style={styles.fontButtonText}>A-</ThemedText>
        </Pressable>
        <Pressable onPress={() => setScaleIndex(index + 1)} disabled={index === maxIndex} style={styles.fontButton}>
          <ThemedText style={[styles.fontButtonText, { fontSize: 18 }]}>A+</ThemedText>
        </Pressable>
      </View>
    </View>
  )
}

function ActionButton({ label, active, disabled, onPress }: { label: string; active?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.actionButton, active && styles.actionButtonActive, disabled && styles.actionButtonDisabled]}>
      <ThemedText style={active ? styles.actionTextActive : styles.actionText}>{label}</ThemedText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { gap: 10, marginVertical: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14 },
  actionButtonActive: { backgroundColor: '#111827', borderColor: '#111827' },
  actionButtonDisabled: { opacity: 0.4 },
  actionText: { fontSize: 13, fontWeight: '600' },
  actionTextActive: { fontSize: 13, fontWeight: '600', color: '#fff' },
  fontRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fontLabel: { opacity: 0.6, marginRight: 4 },
  fontButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  fontButtonText: { fontWeight: '700' },
})
