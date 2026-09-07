import { useCallback, useState } from 'react'
import { ScrollView, View, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { getCommunityPosition, getStreak, getProfileCompletionPercent, getRecommendedForYou, getNewForYou, type CommunityPosition, type DashboardContentItem } from '@pshq/api-client/dashboard'
import { getMyAchievements, checkAndAwardAchievements, checkAndAwardStreakBonus, type EarnedAchievement } from '@pshq/api-client/community'
import { trackDashboardViewed, trackAchievementUnlocked, trackContributionScored } from '@pshq/analytics'
import { ThemedView } from '@/components/themed-view'
import { ThemedText } from '@/components/themed-text'
import { ContentRow } from '@/components/content-row'
import { ProgressBar } from '@/components/progress-bar'
import { openContentItem } from '@/lib/content-nav'
import { supabase } from '@/lib/supabase'
import { Brand } from '@/constants/brand'

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

// Design Brief §5 — the real "My ProductSlice" dashboard, now living on the
// Home tab for signed-in members (it used to be on Profile — Profile is
// now a lean profile summary + Settings entry point instead). Same data
// layer as before (Epic D), rebuilt as scannable visual components:
// progress bars instead of "X done, Y remaining" text, a horizontal
// Continue Learning row, stat tiles for activity. Achievements/Community
// Position stay visually quiet per the brief, this isn't a leaderboard app.
export function MemberDashboard() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [streak, setStreak] = useState(0)
  const [position, setPosition] = useState<CommunityPosition | null>(null)
  const [achievements, setAchievements] = useState<EarnedAchievement[]>([])
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS)
  const [continueLearning, setContinueLearning] = useState<{ id: string; type: string; slug: string; title: string }[]>([])
  const [learningPaths, setLearningPaths] = useState<LearningPathRow[]>([])
  const [recommended, setRecommended] = useState<DashboardContentItem[]>([])
  const [newForYou, setNewForYou] = useState<DashboardContentItem[]>([])
  const [saved, setSaved] = useState<{ id: string; type: string; slug: string; title: string }[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<{ id: string; type: string; slug: string; title: string }[]>([])

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
        for (const m of ((moduleCounts ?? []) as { learning_path_id: string }[])) {
          pathModuleTotals.set(m.learning_path_id, (pathModuleTotals.get(m.learning_path_id) ?? 0) + 1)
        }
      }
      const modulesCompleted = Array.from(completedModulesByPath.values()).reduce((a, b) => a + b, 0)

      const pathRows: LearningPathRow[] = ulps.map(u => {
        const completed = completedModulesByPath.get(u.path!.id) ?? 0
        const total = pathModuleTotals.get(u.path!.id) ?? 0
        return { slug: u.path!.slug, title: u.path!.title, source: u.path!.source, completedModules: completed, remainingModules: Math.max(0, total - completed), isComplete: !!u.completed_at }
      })

      const seenTypes = new Set<string>()
      const continueItems: { id: string; type: string; slug: string; title: string }[] = []
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

      const [newlyEarnedKeys, streakBonusAwarded] = await Promise.all([
        checkAndAwardAchievements(supabase),
        checkAndAwardStreakBonus(supabase),
      ])
      for (const key of newlyEarnedKeys) {
        await trackAchievementUnlocked({ supabase, source: 'mobile', userId: user.id }, key)
      }
      if (streakBonusAwarded) await trackContributionScored({ supabase, source: 'mobile', userId: user.id }, 'streak_bonus', 5)
      setAchievements(await getMyAchievements(supabase, user.id))
    }

    load()
    return () => { cancelled = true }
  }, []))

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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <ThemedText type="subtitle" style={{ color: Brand.cream }}>{name.charAt(0).toUpperCase()}</ThemedText>
            </View>
          )}
          <View style={styles.headerText}>
            <ThemedText type="subtitle" style={styles.headerName}>{name}</ThemedText>
            {profile?.headline ? <ThemedText type="small" style={styles.mutedOnNavy}>{String(profile.headline)}</ThemedText> : null}
          </View>
          <ThemedText style={styles.streakBadge}>🔥 {streak}</ThemedText>
        </View>
        <View style={styles.completionRow}>
          <ProgressBar percent={completionPercent} />
          <ThemedText type="small" style={styles.mutedOnNavy}>{completionPercent}% profile complete</ThemedText>
        </View>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/profile-edit')}>
          <ThemedText style={styles.primaryButtonText}>Edit Profile</ThemedText>
        </Pressable>
      </View>

      <SectionTitle title="Continue Learning" />
      {continueLearning.length === 0 ? (
        <ThemedText type="small" style={styles.muted}>Start an article, ebook, or case and it&apos;ll show up here.</ThemedText>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
          {continueLearning.map(item => (
            <Pressable key={`${item.type}-${item.id}`} style={styles.resumeCard} onPress={() => openContentItem(item)}>
              <ThemedText type="small" style={styles.resumeType}>{item.type}</ThemedText>
              <ThemedText type="default" numberOfLines={2} style={styles.resumeTitle}>{item.title}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <SectionTitle title="My Learning Paths" />
      <Pressable onPress={() => router.push('/learning-paths/create' as never)}>
        <ThemedText type="small" style={styles.createPathLink}>+ Create My Learning Path</ThemedText>
      </Pressable>
      {learningPaths.length === 0 ? (
        <ThemedText type="small" style={styles.muted}>You haven&apos;t started a learning path yet.</ThemedText>
      ) : learningPaths.map(p => {
        const total = p.completedModules + p.remainingModules
        const percent = total > 0 ? Math.round((p.completedModules / total) * 100) : p.isComplete ? 100 : 0
        return (
          <Pressable key={p.slug} style={styles.pathCard} onPress={() => router.push((p.source === 'ai_generated' ? `/learning-paths/mine/${p.slug}` : `/learning-paths/${p.slug}`) as never)}>
            <ThemedText type="default" style={styles.pathTitle}>{p.title}</ThemedText>
            <ProgressBar percent={percent} />
            <ThemedText type="small" style={styles.muted}>
              {p.isComplete ? 'Completed' : `${p.completedModules} of ${total} modules`}
            </ThemedText>
          </Pressable>
        )
      })}

      <SectionTitle title="Recommended For You" />
      {recommended.length === 0 ? (
        <ThemedText type="small" style={styles.muted}>Set your topics and goals in Edit Profile for personalized picks.</ThemedText>
      ) : recommended.map(item => <ContentRow key={item.id} id={item.id} type={item.type} slug={item.slug} title={item.title} />)}

      <SectionTitle title="New For You" />
      {newForYou.length === 0 ? (
        <ThemedText type="small" style={styles.muted}>Nothing new matching your topics yet.</ThemedText>
      ) : newForYou.map(item => <ContentRow key={item.id} id={item.id} type={item.type} slug={item.slug} title={item.title} />)}

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
        <StatTile label="Articles" value={counts.articlesCompleted} />
        <StatTile label="E-books" value={counts.ebooksRead} />
        <StatTile label="Resources" value={counts.resourcesCompleted} />
        <StatTile label="Cases" value={counts.casesCompleted} />
        <StatTile label="Modules" value={counts.modulesCompleted} />
        <StatTile label="Streak" value={streak} />
      </View>

      {/* Quiet by design (Design Brief §5 / §4.7) — a small badge row and
       * one rank line, not a leaderboard the app leads with. */}
      <SectionTitle title="Achievements & Community Position" />
      {position && (
        <ThemedText type="small" style={styles.muted}>#{position.rank} of {position.totalRanked} ranked members · {position.score} points</ThemedText>
      )}
      {achievements.length === 0 ? (
        <ThemedText type="small" style={styles.muted}>Complete your first learning activity to earn an achievement.</ThemedText>
      ) : (
        <View style={styles.achievementRow}>
          {achievements.map(a => (
            <View key={a.key} style={styles.achievementBadge}>
              <ThemedText style={{ fontSize: 14 }}>{a.icon}</ThemedText>
              <ThemedText type="smallBold">{a.title}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statTile}>
      <ThemedText type="subtitle" style={styles.statValue}>{value}</ThemedText>
      <ThemedText type="small" style={styles.muted}>{label}</ThemedText>
    </View>
  )
}

function SectionTitle({ title }: { title: string }) {
  return <ThemedText type="smallBold" style={styles.sectionTitle}>{title}</ThemedText>
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, gap: 8, paddingBottom: 60 },
  headerCard: { backgroundColor: Brand.navy, borderRadius: 16, padding: 18, marginBottom: 8, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: { backgroundColor: Brand.mutedOnNavy, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerName: { color: Brand.cream },
  streakBadge: { color: Brand.gold, fontWeight: '700' },
  completionRow: { gap: 6 },
  mutedOnNavy: { color: Brand.mutedOnNavy },
  muted: { opacity: 0.6, marginTop: 2, marginBottom: 8 },
  primaryButton: { backgroundColor: Brand.gold, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryButtonText: { color: Brand.navy, fontWeight: '700' },
  horizontalRow: { gap: 10, paddingBottom: 4 },
  resumeCard: { width: 160, borderWidth: 1, borderColor: Brand.hairline, borderRadius: 10, padding: 12, gap: 6 },
  resumeType: { textTransform: 'uppercase', opacity: 0.5, fontSize: 10, letterSpacing: 0.5 },
  resumeTitle: { fontWeight: '600' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statTile: { flex: 1, minWidth: '30%', borderWidth: 1, borderColor: Brand.hairline, borderRadius: 10, padding: 12, alignItems: 'center' },
  statValue: { marginBottom: 2 },
  pathCard: { borderWidth: 1, borderColor: Brand.hairline, borderRadius: 10, padding: 12, marginBottom: 8, gap: 8 },
  pathTitle: { fontWeight: '600' },
  sectionTitle: { marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, fontSize: 11 },
  createPathLink: { fontWeight: '600', marginBottom: 8 },
  achievementRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achievementBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffbeb', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
})
