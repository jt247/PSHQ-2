import { useEffect, useState } from 'react'
import { View, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { ThemedText } from '@/components/themed-text'
import { callApi } from '@/lib/api'

interface Comment {
  id: string
  body: string
  is_deleted: boolean
  created_at: string
  user: { full_name: string | null; email: string } | null
}

// Epic F §F.1 mobile parity — the comment/rating UI web already had
// (Build Prompt 3) never existed on mobile at all. Minimal by design,
// matching Step 1's own instruction: text field, submit, chronological
// list, star control. Hits the new /api/comments and /api/ratings routes
// (Bearer-token authed, same pattern as the AI routes) rather than
// duplicating the scoring/spam-check logic natively.
export function CommentsAndRating({ contentId }: { contentId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [ratingSaving, setRatingSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [commentsRes, ratingRes] = await Promise.all([
          callApi(`/api/comments/${contentId}`),
          callApi(`/api/ratings/${contentId}`),
        ])
        const commentsJson = await commentsRes.json()
        const ratingJson = await ratingRes.json()
        setComments(commentsJson.comments ?? [])
        setRating(ratingJson.rating ?? 0)
      } catch {
        // Not signed in / offline — comments/ratings just don't load, the
        // rest of the reader screen still works.
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [contentId])

  async function postComment() {
    if (draft.trim().length < 2) return
    setPosting(true)
    setError(null)
    try {
      const res = await callApi(`/api/comments/${contentId}`, { method: 'POST', body: JSON.stringify({ body: draft.trim() }) })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to post comment.')
      } else {
        setComments(prev => [...prev, { id: `local-${Date.now()}`, body: draft.trim(), is_deleted: false, created_at: new Date().toISOString(), user: null }])
        setDraft('')
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setPosting(false)
    }
  }

  async function submitRating(n: number) {
    setRating(n)
    setRatingSaving(true)
    try {
      await callApi(`/api/ratings/${contentId}`, { method: 'POST', body: JSON.stringify({ rating: n }) })
    } finally {
      setRatingSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" style={styles.heading}>Rate this article</ThemedText>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map(n => (
          <Pressable key={n} onPress={() => submitRating(n)} disabled={ratingSaving}>
            <ThemedText style={[styles.star, n <= rating && styles.starActive]}>★</ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText type="smallBold" style={styles.heading}>Comments ({comments.filter(c => !c.is_deleted).length})</ThemedText>

      <TextInput
        style={styles.input}
        value={draft}
        onChangeText={setDraft}
        placeholder="Share your thoughts…"
        multiline
        maxLength={2000}
      />
      {error && <ThemedText type="small" style={styles.error}>{error}</ThemedText>}
      <Pressable style={[styles.postButton, posting && styles.postButtonDisabled]} onPress={postComment} disabled={posting}>
        <ThemedText style={styles.postButtonText}>{posting ? 'Posting…' : 'Post comment'}</ThemedText>
      </Pressable>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 12 }} />
      ) : comments.length === 0 ? (
        <ThemedText type="small" style={styles.empty}>No comments yet. Be the first!</ThemedText>
      ) : (
        comments.map(c => (
          <View key={c.id} style={styles.comment}>
            <ThemedText type="smallBold">{c.is_deleted ? '[Comment removed]' : (c.user?.full_name || c.user?.email?.split('@')[0] || 'Member')}</ThemedText>
            {!c.is_deleted && <ThemedText type="default" style={styles.commentBody}>{c.body}</ThemedText>}
          </View>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 24 },
  heading: { marginBottom: 10, marginTop: 16 },
  stars: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  star: { fontSize: 24, color: '#d1d5db' },
  starActive: { color: '#f59e0b' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, minHeight: 70, textAlignVertical: 'top', fontSize: 14 },
  error: { color: '#dc2626', marginTop: 4 },
  postButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  postButtonDisabled: { opacity: 0.6 },
  postButtonText: { color: '#fff', fontWeight: '600' },
  empty: { opacity: 0.5, fontStyle: 'italic' },
  comment: { borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 8, padding: 10, marginBottom: 8 },
  commentBody: { marginTop: 4 },
})
