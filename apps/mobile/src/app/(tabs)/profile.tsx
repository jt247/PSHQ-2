import { useCallback, useState } from 'react'
import { ScrollView, View, Pressable, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { getCommunityPosition, getStreak, getProfileCompletionPercent, getRecommendedForYou, getNewForYou, type CommunityPosition, type DashboardContentItem } from '@pshq/api-client/dashboard'
import { trackDashboardViewed } from '@pshq/analytics'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { ContentRow } from '@/components/content-row'
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
  modulesCompleted: number
}

const EMPTY_COUNTS: Counts = { articlesCompleted: 0, ebooksRead: 0, resourcesCompleted: 0, casesCompleted: 0, modulesCompleted: 0 }

interface LearningPathRow {
  slug: string
  title: string
  completedModules: number
  remainingModules: number
  isComplete: boolean
  source: 'curated' | 'ai_generated'
}

// Epic D §D.2/§D.3/§D.4/§D.7 — real My ProductSlice screen, full parity
// with the web dashboard's personal sections (Continue Learning,
// Recommended/New For You, My Learning Paths, Saved, Recently Viewed,
// Learning Activity, Achievements, Community Position). Trending/courses/
// ebook-template bento are deliberately not duplicated here — those are
// browse-surface content already covered by the Home/Library/Learn tabs;
// everything that's specific to THIS member is here, matching what web
// shows on /dashboard.
export default function ProfileScreen() {
  const { signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [streak, setStreak] = useState(0)
  const [position, setPosition] = useState<CommunityPosition | null>(null)
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS)
  const [continueLearning, setContinueLearning] = useState<Array<{ id: string; type: string; slug: string; title: string }>>([])
  const [learningPaths, setLearningPaths] = useState<LearningPathRow[]>([])
  const [recommended, setRecommended] = useState<DashboardContentItem[]>([])
  const [newForYou, setNewForYou] = useState<DashboardContentItem[]>([])
  const [saved, setSaved] = useState<Array<{ id: string; type: string; slug: string; title: string }>>([])
  const [recentlyViewed, setRecentlyViewed] = useState<Array<{ id: string; type: string; slug: string; title: string }>>([])

  useFocusEffect(useCallback(() => {
    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [
        profileRes, streakVal, positionVal, recommendedVal, newForYouVal,
        interactionsRes, contentProgressRes, caseProgressRes,
        favoritesRes, userLearningPathsRes, moduleProgressRes,
      ] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        getStreak(supabase),
        getCommunityPosition(supabase),
        getRecommendedForYou(supabase, user.id, 5),
        getNewForYou(supabase, user.id, 5),
        supabase.from('content_interactions')
          .select('type, created_at, content:content_id(id, title, slug, type)')
          .eq('user_id', user.id).in('type', ['view', 'download', 'read']).order('created_at', { ascending: false }),
        supabase.from('content_progress').select('content_id, status, content:content_id(type)').eq('user_id', user.id),
        supabase.from('case_progress').select('status, last_viewed_at, completed_at, case:case_library_entries(id, title, slug)').eq('user_id', user.id),
        supabase.from('content_favorites').select('content:content(id, title, slug, type)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('user_learning_paths').select('started_at, completed_at, path:learning_paths(id, title, slug, source)').eq('user_id', user.id).order('started_at', { ascending: false }),
        supabase.from('module_progress').select('status, module:learning_path_modules(learning_path_id)').eq('user_id', user.id),
      ])
      if (cancelled) return

      type Interaction = { type: string; created_at: string; content: { id: string; title: string; slug: string; type: string } | null }
      const interactions = (interactionsRes.data ?? []) as unknown as Interaction[]

      type ContentProgress = { content_id: string; status: string; content: { type: string } | null }
      const contentProgress = (contentProgressRes.data ?? []) as unknown as ContentProgress[]
      const completedContentIds = new Set(contentProgress.filter(c => c.status === 'completed').map(c => c.content_id))
      const completedByType: Record<string, number> = {}
      for (const cp of contentProgress) {
        if (cp.status === 'completed' && cp.content?.type) completedByType[cp.content.type] = (completedByType[cp.content.type] ?? 0) + 1
      }

      type CaseProgress = { status: string; last_viewed_at: string | null; completed_at: string | null; case: { id: string; title: string; slug: string } | null }
      const caseProgress = (caseProgressRes.data ?? []) as unknown as CaseProgress[]
      const casesCompleted = caseProgress.filter(c => c.status === 'completed').length

      type ULP = { started_at: string; completed_at: string | null; path: { id: string; title: string; slug: string; source: 'curated' | 'ai_generated' } | null }
      const ulps = ((userLearningPathsRes.data ?? []) as unknown as ULP[]).filter(u => u.path)
      type ModuleProgress = { status: string; module: { learning_path_id: string } | null }
      const completedModulesByPath = new Map<string, number>()
      for (const mp of ((moduleProgressRes.data ?? []) as unknown as ModuleProgress[])) {
        if (mp.status === 'completed' && mp.module?.learning_path_id) {
          completedModulesByPath.set(mp.module.learning_path_id, (completedModulesByPath.get(mp.module.learning_path_id) ?? 0) + 1)
        }
      }
      let pathModuleTotals = new Map<string, number>()
      if (ulps.length > 0) {
        const { data: moduleCounts } = await supabase.from('learning_path_modules').select('learning_path_id').in('learning_path_id', ulps.map(u => u.path!.id))
        pathModuleTotals = new Map()
        for (const m of ((moduleCounts ?? []) as Array<{ learning_path_id: string }>)) {
          pathModuleTotals.set(m.learning_path_id, (pathModuleTotals.get(m.learning_path_id) ?? 0) + 1)
        }
      }
      const modulesCompleted = Array.from(completedModulesByPath.values()).reduce((a, b) => a + b, 0)

      const pathRows: LearningPathRow[] = ulps.map(u => {
        const completed = completedModulesByPath.get(u.path!.id) ?? 0
        const total = pathModuleTotals.get(u.path!.id) ?? 0
        return { slug: u.path!.slug, title: u.path!.title, source: u.path!.source, completedModules: completed, remainingModules: Math.max(0, total - completed), isComplete: !!u.completed_at }
      })

      // Continue Learning: last article/ebook not completed + last case
      // viewed but not completed.
      const seenTypes = new Set<string>()
      const continueItems: Array<{ id: string; type: string; slug: string; title: string }> = []
      for (const i of interactions) {
        const c = i.content
        if (!c || completedContentIds.has(c.id)) continue
        if (c.type !== 'article' && c.type !== 'ebook') continue
        if (seenTypes.has(c.type)) continue
        seenTypes.add(c.type)
        continueItems.push({ id: c.id, type: c.type, slug: c.slug, title: c.title })
      }
      const lastCase = caseProgress.filter(c => c.case && c.last_viewed_at && !c.completed_at).sort((a, b) => (b.last_viewed_at ?? '').localeCompare(a.last_viewed_at ?? ''))[0]
      if (lastCase?.case) continueItems.push({ id: lastCase.case.id, type: 'case', slug: lastCase.case.slug, title: lastCase.case.title })

      const seenRecent = new Set<string>()
      const recent = interactions
        .map(i => i.content).filter((c): c is NonNullable<typeof c> => !!c)
        .filter(c => (seenRecent.has(c.id) ? false : (seenRecent.add(c.id), true)))
        .slice(0, 5)

      type FavRow = { content: { id: string; title: string; slug: string; type: string } | null }
      const savedItems = ((favoritesRes.data ?? []) as unknown as FavRow[]).map(r => r.content).filter((c): c is NonNullable<typeof c> => !!c)

      setProfile(profileRes.data as ProfileData)
      setStreak(streakVal)
      setPosition(positionVal)
      setRecommended(recommendedVal)
      setNewForYou(newForYouVal)
      setContinueLearning(continueItems)
      setLearningPaths(pathRows)
      setSaved(savedItems)
      setRecentlyViewed(recent)
      setCounts({
        articlesCompleted: completedByType.article ?? 0,
        ebooksRead: completedByType.ebook ?? 0,
        resourcesCompleted: completedByType.template ?? 0,
        casesCompleted,
        modulesCompleted,
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

        {completionPercent < 100 && (
          <ThemedText type="small" style={styles.completionNudge}>
            Add a headline, your skills, and links so other members can find and recognize you.
          </ThemedText>
        )}

        <Pressable style={styles.primaryButton} onPress={() => router.push('/profile-edit')}>
          <ThemedText style={styles.primaryButtonText}>Edit Profile</ThemedText>
        </Pressable>
        {typeof profile?.username === 'string' && profile.username && (
          <Pressable onPress={() => router.push(`/profile/${profile.username}` as never)}>
            <ThemedText type="small" style={styles.viewPublicLink}>View your public profile →</ThemedText>
          </Pressable>
        )}

        <SectionTitle title="Continue Learning" />
        {continueLearning.length === 0 ? (
          <ThemedText type="small" style={styles.muted}>Start an article, ebook, or case and it&apos;ll show up here.</ThemedText>
        ) : continueLearning.map(item => <ContentRow key={`${item.type}-${item.id}`} {...item} />)}

        <SectionTitle title="Recommended For You" />
        {recommended.length === 0 ? (
          <ThemedText type="small" style={styles.muted}>Set your topics and goals in Edit Profile for personalized picks.</ThemedText>
        ) : recommended.map(item => <ContentRow key={item.id} id={item.id} type={item.type} slug={item.slug} title={item.title} />)}

        <SectionTitle title="New For You" />
        {newForYou.length === 0 ? (
          <ThemedText type="small" style={styles.muted}>Nothing new matching your topics yet.</ThemedText>
        ) : newForYou.map(item => <ContentRow key={item.id} id={item.id} type={item.type} slug={item.slug} title={item.title} />)}

        <SectionTitle title="My Learning Paths" />
        <Pressable onPress={() => router.push('/learning-paths/create' as never)}>
          <ThemedText type="small" style={styles.createPathLink}>+ Create My Learning Path</ThemedText>
        </Pressable>
        {learningPaths.length === 0 ? (
          <ThemedText type="small" style={styles.muted}>You haven&apos;t started a learning path yet.</ThemedText>
        ) : learningPaths.map(p => (
          <Pressable key={p.slug} style={styles.pathCard} onPress={() => router.push((p.source === 'ai_generated' ? `/learning-paths/mine/${p.slug}` : `/learning-paths/${p.slug}`) as never)}>
            <ThemedText type="default" style={styles.pathTitle}>{p.title}</ThemedText>
            <ThemedText type="small" style={styles.muted}>
              {p.isComplete ? 'Completed' : `${p.completedModules} done · ${p.remainingModules} remaining`}
            </ThemedText>
          </Pressable>
        ))}

        <SectionTitle title="Saved" />
        {saved.length === 0 ? (
          <ThemedText type="small" style={styles.muted}>Tap the favorite button on any article, ebook, or template to save it here.</ThemedText>
        ) : saved.map(item => <ContentRow key={item.id} id={item.id} type={item.type} slug={item.slug} title={item.title} />)}

        <SectionTitle title="Recently Viewed" />
        {recentlyViewed.length === 0 ? (
          <ThemedText type="small" style={styles.muted}>What you read or open will show up here.</ThemedText>
        ) : recentlyViewed.map(item => <ContentRow key={item.id} id={item.id} type={item.type} slug={item.slug} title={item.title} />)}

        <SectionTitle title="Learning Activity" />
        <View style={styles.statGrid}>
          <Stat label="Articles" value={String(counts.articlesCompleted)} />
          <Stat label="E-books" value={String(counts.ebooksRead)} />
          <Stat label="Resources" value={String(counts.resourcesCompleted)} />
          <Stat label="Cases" value={String(counts.casesCompleted)} />
          <Stat label="Modules" value={String(counts.modulesCompleted)} />
          <Stat label="Day streak" value={String(streak)} />
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
  container: { padding: 20, gap: 8, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  muted: { opacity: 0.6, marginTop: 2, marginBottom: 8 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statBox: { flex: 1, minWidth: '30%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, alignItems: 'center' },
  statValue: { marginBottom: 2 },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, marginBottom: 8 },
  pathCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 8 },
  pathTitle: { fontWeight: '600', marginBottom: 4 },
  sectionTitle: { marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, fontSize: 11 },
  primaryButton: { backgroundColor: '#111827', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  viewPublicLink: { textAlign: 'center', marginTop: 10, fontWeight: '600' },
  createPathLink: { fontWeight: '600', marginBottom: 8 },
  completionNudge: { textAlign: 'center', opacity: 0.7, marginBottom: 4 },
  secondaryButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 20 },
  secondaryButtonText: { fontWeight: '600' },
  signOutButton: { paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  signOutText: { color: '#dc2626', fontWeight: '600' },
})
