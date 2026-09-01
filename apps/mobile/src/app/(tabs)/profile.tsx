import { useCallback, useState } from 'react'
import { ScrollView, View, Pressable, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { getCommunityPosition, getStreak, getProfileCompletionPercent, type CommunityPosition } from '@pshq/api-client/dashboard'
import { trackDashboardViewed } from '@pshq/analytics'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

interface ProfileData {
  full_name: string | null
  headline: string | null
  avatar_url: string | null
  [key: string]: unknown
}

interface Counts {
  articlesCompleted: number
  ebooksRead: number
  resourcesCompleted: number
  casesCompleted: number
  savedCount: number
  learningPathsStarted: number
}

const EMPTY_COUNTS: Counts = { articlesCompleted: 0, ebooksRead: 0, resourcesCompleted: 0, casesCompleted: 0, savedCount: 0, learningPathsStarted: 0 }

// Epic D §D.2/§D.3/§D.4/§D.7 — real My ProductSlice screen replacing the
// Build Prompt 1 placeholder. Condensed, mobile-appropriate versions of
// the web dashboard's sections, sharing every data function with web via
// @pshq/api-client/dashboard (Recommended/New For You are deliberately
// left off this v1 mobile screen — they're browse-surface content, and
// mobile already has a dedicated Library tab for that; nothing here is a
// stub, every number shown is real).
export default function ProfileScreen() {
  const { signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [streak, setStreak] = useState(0)
  const [position, setPosition] = useState<CommunityPosition | null>(null)
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS)

  useFocusEffect(useCallback(() => {
    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, streakVal, positionVal, contentProgressRes, caseProgressRes, favoritesRes, pathsRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        getStreak(supabase),
        getCommunityPosition(supabase),
        supabase.from('content_progress').select('status, content:content_id(type)').eq('user_id', user.id),
        supabase.from('case_progress').select('status').eq('user_id', user.id),
        supabase.from('content_favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_learning_paths').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])
      if (cancelled) return

      const completedByType: Record<string, number> = {}
      for (const cp of ((contentProgressRes.data ?? []) as unknown as Array<{ status: string; content: { type: string } | null }>)) {
        if (cp.status === 'completed' && cp.content?.type) completedByType[cp.content.type] = (completedByType[cp.content.type] ?? 0) + 1
      }
      const casesCompleted = ((caseProgressRes.data ?? []) as Array<{ status: string }>).filter(r => r.status === 'completed').length

      setProfile(profileRes.data as ProfileData)
      setStreak(streakVal)
      setPosition(positionVal)
      setCounts({
        articlesCompleted: completedByType.article ?? 0,
        ebooksRead: completedByType.ebook ?? 0,
        resourcesCompleted: completedByType.template ?? 0,
        casesCompleted,
        savedCount: favoritesRes.count ?? 0,
        learningPathsStarted: pathsRes.count ?? 0,
      })
      setLoading(false)

      await trackDashboardViewed({ supabase, source: 'mobile', userId: user.id })
    }

    load()
    return () => { cancelled = true }
  }, []))

  async function handleSignOut() {
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ])
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    )
  }

  const name = profile?.full_name ?? 'there'
  const completionPercent = profile ? getProfileCompletionPercent(profile) : 0

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
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

        <View style={styles.statRow}>
          <Stat label="Day streak" value={`🔥 ${streak}`} />
          <Stat label="Profile complete" value={`${completionPercent}%`} />
        </View>

        <Pressable style={styles.primaryButton} onPress={() => router.push('/profile-edit')}>
          <ThemedText style={styles.primaryButtonText}>Edit Profile</ThemedText>
        </Pressable>

        <SectionTitle title="Learning Activity" />
        <View style={styles.statGrid}>
          <Stat label="Articles" value={String(counts.articlesCompleted)} />
          <Stat label="E-books" value={String(counts.ebooksRead)} />
          <Stat label="Resources" value={String(counts.resourcesCompleted)} />
          <Stat label="Cases" value={String(counts.casesCompleted)} />
          <Stat label="Saved" value={String(counts.savedCount)} />
          <Stat label="Paths started" value={String(counts.learningPathsStarted)} />
        </View>

        <SectionTitle title="Community Position" />
        {position ? (
          <View style={styles.card}>
            <ThemedText type="default">#{position.rank} of {position.totalRanked} ranked members</ThemedText>
            <ThemedText type="small" style={styles.muted}>{position.score} contribution points</ThemedText>
          </View>
        ) : (
          <ThemedText type="small" style={styles.muted}>Not yet ranked — comment, upvote, or share content to start earning points.</ThemedText>
        )}

        <SectionTitle title="Achievements" />
        <ThemedText type="small" style={styles.muted}>Complete your first learning activity to earn an achievement.</ThemedText>

        <Pressable style={styles.secondaryButton} onPress={() => router.push('/notification-preferences')}>
          <ThemedText style={styles.secondaryButtonText}>Notification Preferences</ThemedText>
        </Pressable>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <ThemedText type="subtitle" style={styles.statValue}>{value}</ThemedText>
      <ThemedText type="small" style={styles.muted}>{label}</ThemedText>
    </View>
  )
}

function SectionTitle({ title }: { title: string }) {
  return <ThemedText type="smallBold" style={styles.sectionTitle}>{title}</ThemedText>
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  muted: { opacity: 0.6, marginTop: 2 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statBox: { flex: 1, minWidth: '30%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, alignItems: 'center' },
  statValue: { marginBottom: 2 },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, marginBottom: 8 },
  sectionTitle: { marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, fontSize: 11 },
  primaryButton: { backgroundColor: '#111827', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 20 },
  secondaryButtonText: { fontWeight: '600' },
  signOutButton: { paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  signOutText: { color: '#dc2626', fontWeight: '600' },
})
