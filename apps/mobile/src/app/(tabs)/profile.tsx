import { useCallback, useState } from 'react'
import { View, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { supabase } from '@/lib/supabase'
import { Brand } from '@/constants/brand'

interface ProfileData {
  full_name: string | null
  headline: string | null
  avatar_url: string | null
  username: string | null
}

// Design Brief §5 — Profile is now "you", not a second dashboard: a
// summary card plus a way in to Edit Profile, your public profile, and
// Settings (the new grouped screen — see settings.tsx). The actual
// dashboard content (Continue Learning, Learning Paths, Achievements,
// etc.) moved to the Home tab, see member-dashboard.tsx.
export default function ProfileScreen() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileData | null>(null)

  useFocusEffect(useCallback(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('full_name, headline, avatar_url, username').eq('id', user.id).single()
      if (!cancelled) { setProfile(data as ProfileData); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, []))

  if (loading) {
    return <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>
  }

  const name = profile?.full_name ?? 'there'

  return (
    <ThemedView style={styles.flex}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <ThemedText type="subtitle">{name.charAt(0).toUpperCase()}</ThemedText>
            </View>
          )}
          <View style={styles.headerText}>
            <ThemedText type="subtitle">{name}</ThemedText>
            {profile?.headline ? <ThemedText type="small" style={styles.muted}>{String(profile.headline)}</ThemedText> : null}
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={() => router.push('/profile-edit')}>
          <ThemedText style={styles.primaryButtonText}>Edit Profile</ThemedText>
        </Pressable>
        {profile?.username ? (
          <Pressable onPress={() => router.push(`/profile/${profile.username}` as never)}>
            <ThemedText type="small" style={styles.viewPublicLink}>View your public profile →</ThemedText>
          </Pressable>
        ) : null}

        <View style={styles.linksGroup}>
          <Pressable style={styles.linkRow} onPress={() => router.push('/community' as never)}>
            <Ionicons name="people-outline" size={20} color={Brand.navy} />
            <ThemedText type="default" style={styles.linkRowText}>Community</ThemedText>
            <Ionicons name="chevron-forward" size={18} color={Brand.mutedOnCream} />
          </Pressable>
          <Pressable style={styles.linkRow} onPress={() => router.push('/settings' as never)}>
            <Ionicons name="settings-outline" size={20} color={Brand.navy} />
            <ThemedText type="default" style={styles.linkRowText}>Settings</ThemedText>
            <Ionicons name="chevron-forward" size={18} color={Brand.mutedOnCream} />
          </Pressable>
        </View>
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  muted: { opacity: 0.6, marginTop: 2 },
  primaryButton: { backgroundColor: '#111827', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  viewPublicLink: { textAlign: 'center', marginTop: 10, fontWeight: '600' },
  linksGroup: { borderWidth: 1, borderColor: Brand.hairline, borderRadius: 12, marginTop: 28, overflow: 'hidden' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Brand.hairline },
  linkRowText: { flex: 1, fontWeight: '600' },
})
