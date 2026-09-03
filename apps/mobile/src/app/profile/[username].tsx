import { useEffect, useState } from 'react'
import { ScrollView, View, Pressable, StyleSheet, ActivityIndicator, Image, Linking } from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { getPublicProfile, type PublicProfile } from '@pshq/api-client/dashboard'
import { ACHIEVEMENT_METADATA } from '@pshq/api-client/community'
import { trackProfileViewed } from '@pshq/analytics'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { supabase } from '@/lib/supabase'

const LINK_FIELDS: [key: 'linkedinUrl' | 'portfolioUrl' | 'websiteUrl' | 'githubUrl' | 'xUrl', label: string][] = [
  ['linkedinUrl', 'LinkedIn'], ['portfolioUrl', 'Portfolio'], ['websiteUrl', 'Website'],
  ['githubUrl', 'GitHub'], ['xUrl', 'X'],
]

// Epic D §D.4/§D.5 — mobile parity for /profile/[username]. Same privacy
// enforcement as web: entirely inside get_public_profile() (packages/
// database migration 20260901000028), nothing re-checked or re-implemented
// here — a private profile someone else requests and a username that
// doesn't exist both just come back null.
export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const result = await getPublicProfile(supabase, username)
      setProfile(result)
      if (result) {
        setIsOwnProfile(user?.id === result.id)
        await trackProfileViewed({ supabase, source: 'mobile', userId: user?.id ?? null }, result.id)
      }
      setLoading(false)
    }
    load()
  }, [username])

  if (loading) return <ThemedView style={styles.center}><ActivityIndicator /></ThemedView>

  if (!profile) {
    return (
      <ThemedView style={styles.center}>
        <Stack.Screen options={{ title: 'Profile', headerShown: true }} />
        <ThemedText type="default">Profile not found.</ThemedText>
      </ThemedView>
    )
  }

  const location = [profile.country, profile.region].filter(Boolean).join(', ')

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: profile.fullName ?? profile.username ?? 'Profile', headerShown: true }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <ThemedText type="subtitle">{(profile.fullName ?? profile.username ?? '?').charAt(0).toUpperCase()}</ThemedText>
            </View>
          )}
          <View style={styles.headerText}>
            <ThemedText type="subtitle">{profile.fullName ?? profile.username}</ThemedText>
            {profile.headline ? <ThemedText type="small" style={styles.muted}>{profile.headline}</ThemedText> : null}
          </View>
        </View>

        {isOwnProfile && (
          <Pressable style={styles.editLink} onPress={() => router.push('/profile-edit')}>
            <ThemedText style={styles.editLinkText}>Edit your profile →</ThemedText>
          </Pressable>
        )}

        <View style={styles.badgeRow}>
          {profile.jobRole && <Badge text={`${profile.jobRole}${profile.company ? ` @ ${profile.company}` : ''}`} />}
          {location && <Badge text={location} />}
          {profile.experienceLevel && <Badge text={`${profile.experienceLevel}${profile.yearsExperience ? ` · ${profile.yearsExperience}y` : ''}`} />}
        </View>

        {profile.bio && <ThemedText type="default" style={styles.bio}>{profile.bio}</ThemedText>}

        {profile.skills.length > 0 && (
          <>
            <SectionTitle title="Skills" />
            <View style={styles.badgeRow}>{profile.skills.map(s => <Badge key={s} text={s} />)}</View>
          </>
        )}

        {(profile.topicNames.length > 0 || profile.goalNames.length > 0) && (
          <>
            <SectionTitle title="Focused on" />
            <View style={styles.badgeRow}>{[...profile.topicNames, ...profile.goalNames].map(t => <Badge key={t} text={t} />)}</View>
          </>
        )}

        <View style={styles.statGrid}>
          <Stat label="Paths Completed" value={String(profile.completedPathsCount)} />
          <Stat label="Resources Completed" value={String(profile.completedResourcesCount)} />
          <Stat label="Contribution Points" value={String(profile.contributionScore)} />
        </View>

        <SectionTitle title="Achievements" />
        {profile.achievementKeys.length === 0 ? (
          <ThemedText type="small" style={styles.muted}>No achievements yet.</ThemedText>
        ) : (
          <View style={styles.badgeRow}>
            {profile.achievementKeys.map(key => {
              const meta = ACHIEVEMENT_METADATA[key]
              if (!meta) return null
              return (
                <View key={key} style={styles.badge}>
                  <ThemedText style={{ fontSize: 14 }}>{meta.icon}</ThemedText>
                  <ThemedText style={styles.badgeText}>{meta.title}</ThemedText>
                </View>
              )
            })}
          </View>
        )}

        {LINK_FIELDS.some(([key]) => profile[key]) && (
          <View style={styles.linkRow}>
            {LINK_FIELDS.filter(([key]) => profile[key]).map(([key, label]) => (
              <Pressable key={key} style={styles.linkButton} onPress={() => Linking.openURL(profile[key]!)}>
                <ThemedText style={styles.linkButtonText}>{label} →</ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  )
}

function Badge({ text }: { text: string }) {
  return (
    <View style={styles.badge}><ThemedText style={styles.badgeText}>{text}</ThemedText></View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  container: { padding: 20, gap: 4, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  muted: { opacity: 0.6, marginTop: 2 },
  editLink: { marginBottom: 12 },
  editLinkText: { fontWeight: '600' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  badge: { backgroundColor: '#f3f4f6', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { fontSize: 12 },
  bio: { marginBottom: 16, lineHeight: 20 },
  statGrid: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statBox: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, alignItems: 'center' },
  statValue: { marginBottom: 2 },
  sectionTitle: { marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, fontSize: 11 },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  linkButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  linkButtonText: { fontSize: 13, fontWeight: '600' },
})
