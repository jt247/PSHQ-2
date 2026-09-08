import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Layers, BookOpen, Package, Wrench, Newspaper } from 'lucide-react'
import { createClient } from '@pshq/api-client/server'
import { getCommunityPosition, getStreak, getRecommendedForYou, getNewForYou, getProfileCompletionPercent } from '@pshq/api-client/dashboard'
import { getMyAchievements, checkAndAwardAchievements, checkAndAwardStreakBonus } from '@pshq/api-client/community'
import { rerankRecommendations } from '@/lib/ai/rerank'
import { trackDashboardViewed, trackAiRecommendationShown, trackAchievementUnlocked, trackContributionScored } from '@pshq/analytics'
import type { UserRow, ContentRow, OnboardingProgressRow } from '@pshq/database'
import { MyProductSliceHeader } from '@/components/dashboard/MyProductSliceHeader'
import { ContinueLearningSection, type ContinueLearningItem, type ContinueLearningPath } from '@/components/dashboard/ContinueLearningSection'
import { MyLearningPathsSection, type MyLearningPathItem } from '@/components/dashboard/MyLearningPathsSection'
import { ContentListSection } from '@/components/dashboard/ContentListSection'
import { LearningActivitySection } from '@/components/dashboard/LearningActivitySection'
import { AchievementsAndPositionRow } from '@/components/dashboard/AchievementsAndPositionRow'

// Live feedback (2026-09-08) — recommendations trimmed from 6 to 3 per
// slot: "prioritize highly" rather than list everything.
const RECOMMENDATION_LIMIT = 3

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  await trackDashboardViewed({ supabase, source: 'web', userId: user.id })

  // Epic F — cheap, idempotent checks on every dashboard load: catches
  // achievements/streak bonuses earned from activity that predates this
  // epic shipping, not just going forward.
  const [newlyEarnedKeys, streakBonusAwarded] = await Promise.all([
    checkAndAwardAchievements(supabase),
    checkAndAwardStreakBonus(supabase),
  ])
  for (const key of newlyEarnedKeys) await trackAchievementUnlocked({ supabase, source: 'web', userId: user.id }, key)
  if (streakBonusAwarded) await trackContributionScored({ supabase, source: 'web', userId: user.id }, 'streak_bonus', 5)
  const achievements = await getMyAchievements(supabase, user.id)

  const [
    profileRes, interactionsRes, trendingRes, trendingEbooksRes, trendingTemplatesRes,
    onboardingProgressRes, userLearningPathsRes, moduleProgressRes, contentProgressRes, caseProgressRes,
    streak, communityPosition, recommendedLayer1, newForYouLayer1,
    userTopicsRes, userGoalsRes,
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('content_interactions')
      .select('id, type, created_at, content:content_id(id, title, slug, type, cover_image_url)')
      .eq('user_id', user.id)
      .in('type', ['view', 'download', 'read'])
      .order('created_at', { ascending: false }),
    supabase.from('content').select('id, title, slug, type, view_count, published_at').eq('status', 'published').eq('type', 'article').order('view_count', { ascending: false }).limit(3),
    supabase.from('content').select('id, title, slug, cover_image_url, tags').eq('status', 'published').eq('type', 'ebook').order('published_at', { ascending: false }).limit(3),
    supabase.from('content').select('id, title, slug, cover_image_url, tags').eq('status', 'published').eq('type', 'template').order('published_at', { ascending: false }).limit(3),
    supabase.from('onboarding_progress').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('user_learning_paths').select('started_at, completed_at, path:learning_paths(id, title, slug, source)').eq('user_id', user.id).order('started_at', { ascending: false }),
    supabase.from('module_progress').select('status, module:learning_path_modules(learning_path_id)').eq('user_id', user.id),
    supabase.from('content_progress').select('status, content:content_id(type)').eq('user_id', user.id),
    supabase.from('case_progress').select('status, last_viewed_at, completed_at, case:case_library_entries(id, title, slug)').eq('user_id', user.id),
    getStreak(supabase),
    getCommunityPosition(supabase),
    getRecommendedForYou(supabase, user.id, RECOMMENDATION_LIMIT),
    getNewForYou(supabase, user.id, RECOMMENDATION_LIMIT),
    supabase.from('user_topics').select('topic:topics(name)').eq('user_id', user.id),
    supabase.from('user_goals').select('goal:goals(name)').eq('user_id', user.id),
  ])

  const profile = profileRes.data as UserRow | null

  // Layer 2 (E.6) — re-rank what Layer 1 already retrieved, using fuller
  // context than the tag-overlap scorer alone. Falls back silently to
  // Layer-1 order on any AI failure — see rerank.ts.
  const topicNames = ((userTopicsRes.data ?? []) as unknown as Array<{ topic: { name: string } | null }>).map(t => t.topic?.name).filter((n): n is string => !!n)
  const goalNames = ((userGoalsRes.data ?? []) as unknown as Array<{ goal: { name: string } | null }>).map(g => g.goal?.name).filter((n): n is string => !!n)
  const rerankContext = { roleName: null, level: profile?.experience_level ?? null, topicNames, goalNames }
  const [recommended, newForYou] = await Promise.all([
    rerankRecommendations(supabase, user.id, 'recommended_for_you', recommendedLayer1.map(r => ({ ...r, excerpt: r.summary ?? '' })), rerankContext),
    rerankRecommendations(supabase, user.id, 'new_for_you', newForYouLayer1.map(r => ({ ...r, excerpt: r.summary ?? '' })), rerankContext),
  ])
  if (recommended.length > 0) await trackAiRecommendationShown({ supabase, source: 'web', userId: user.id }, 'recommended_for_you', recommended.map(r => r.id))
  if (newForYou.length > 0) await trackAiRecommendationShown({ supabase, source: 'web', userId: user.id }, 'new_for_you', newForYou.map(r => r.id))
  const onboardingProgress = onboardingProgressRes.data as OnboardingProgressRow | null
  const onboardingSteps = onboardingProgress
    ? [onboardingProgress.about_you_completed_at, onboardingProgress.role_completed_at, onboardingProgress.experience_completed_at, onboardingProgress.goals_completed_at, onboardingProgress.topics_completed_at]
    : []
  const onboardingStepsDone = onboardingSteps.filter(Boolean).length

  type InteractionRow = { id: string; type: string; created_at: string; content: Partial<ContentRow> | null }
  const interactions = (interactionsRes.data ?? []) as InteractionRow[]
  const trending = (trendingRes.data ?? []) as Array<Pick<ContentRow, 'id' | 'title' | 'slug' | 'type' | 'view_count'>>

  const engagedById = new Map<string, Partial<ContentRow>>()
  for (const i of interactions) {
    if (i.content?.id && !engagedById.has(i.content.id)) engagedById.set(i.content.id, i.content)
  }
  const owned = Array.from(engagedById.values())

  const trendingEbooks = (trendingEbooksRes.data ?? []) as Array<{ id: string; title: string; slug: string; cover_image_url: string | null; tags: string[] | null }>
  const trendingTemplates = (trendingTemplatesRes.data ?? []) as Array<{ id: string; title: string; slug: string; cover_image_url: string | null; tags: string[] | null }>

  const name = profile?.full_name?.split(' ')[0] ?? 'there'
  const ebooks = owned.filter(c => c.type === 'ebook')
  const articles = owned.filter(c => c.type === 'article')
  const resources = owned.filter(c => c.type === 'template')
  const buildNotes = owned.filter(c => c.type === 'build_note')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // ── My Learning Paths + Continue Learning path slot ──
  type ULPRow = { started_at: string; completed_at: string | null; path: { id: string; title: string; slug: string; source: 'curated' | 'ai_generated' } | null }
  const ulps = ((userLearningPathsRes.data ?? []) as unknown as ULPRow[]).filter(r => r.path)
  type ModuleProgressRow = { status: string; module: { learning_path_id: string } | null }
  const completedModulesByPath = new Map<string, number>()
  for (const mp of ((moduleProgressRes.data ?? []) as unknown as ModuleProgressRow[])) {
    if (mp.status === 'completed' && mp.module?.learning_path_id) {
      completedModulesByPath.set(mp.module.learning_path_id, (completedModulesByPath.get(mp.module.learning_path_id) ?? 0) + 1)
    }
  }
  const pathModuleTotals = new Map<string, number>()
  if (ulps.length > 0) {
    const { data: moduleCounts } = await supabase.from('learning_path_modules').select('learning_path_id').in('learning_path_id', ulps.map(u => u.path!.id))
    for (const m of ((moduleCounts ?? []) as Array<{ learning_path_id: string }>)) {
      pathModuleTotals.set(m.learning_path_id, (pathModuleTotals.get(m.learning_path_id) ?? 0) + 1)
    }
  }

  const myLearningPaths: MyLearningPathItem[] = ulps.map(u => {
    const completed = completedModulesByPath.get(u.path!.id) ?? 0
    const total = pathModuleTotals.get(u.path!.id) ?? 0
    return {
      slug: u.path!.slug, title: u.path!.title, source: u.path!.source,
      completedModules: completed, remainingModules: Math.max(0, total - completed),
      isComplete: !!u.completed_at,
    }
  })

  const inProgressPathRow = ulps.find(u => !u.completed_at)
  const continueLearningPath: ContinueLearningPath | null = inProgressPathRow ? {
    slug: inProgressPathRow.path!.slug, title: inProgressPathRow.path!.title,
    completedModules: completedModulesByPath.get(inProgressPathRow.path!.id) ?? 0,
    totalModules: pathModuleTotals.get(inProgressPathRow.path!.id) ?? 0,
  } : null

  // ── Continue Learning: last article/ebook + last case not yet completed ──
  // content_progress was fetched above joined to content.type (for the
  // Learning Activity breakdown below), which doesn't include content_id
  // itself — a second lightweight query gets the actual ids to exclude.
  const { data: completedRows } = await supabase.from('content_progress').select('content_id').eq('user_id', user.id).eq('status', 'completed')
  const trulyCompletedIds = new Set((completedRows ?? []).map(r => r.content_id as string))

  const seenContinueTypes = new Set<string>()
  const continueLearningItems: ContinueLearningItem[] = []
  for (const i of interactions) {
    const c = i.content
    if (!c?.id || !c.type) continue
    if (trulyCompletedIds.has(c.id)) continue
    if (c.type !== 'article' && c.type !== 'ebook') continue
    if (seenContinueTypes.has(c.type)) continue
    seenContinueTypes.add(c.type)
    continueLearningItems.push({ id: c.id, title: c.title ?? '', type: c.type, slug: c.slug ?? '' })
  }
  type CaseProgressRow = { status: string; last_viewed_at: string | null; completed_at: string | null; case: { id: string; title: string; slug: string } | null }
  const lastCase = ((caseProgressRes.data ?? []) as unknown as CaseProgressRow[])
    .filter(r => r.case && r.last_viewed_at && !r.completed_at)
    .sort((a, b) => (b.last_viewed_at ?? '').localeCompare(a.last_viewed_at ?? ''))[0]
  if (lastCase?.case) continueLearningItems.push({ id: lastCase.case.id, title: lastCase.case.title, type: 'case', slug: lastCase.case.slug })

  // ── Learning Activity counts ──
  type ContentProgressRow = { status: string; content: { type: string } | null }
  const completedByType: Record<string, number> = {}
  for (const cp of ((contentProgressRes.data ?? []) as unknown as ContentProgressRow[])) {
    if (cp.status === 'completed' && cp.content?.type) completedByType[cp.content.type] = (completedByType[cp.content.type] ?? 0) + 1
  }
  const modulesCompleted = Array.from(completedModulesByPath.values()).reduce((a, b) => a + b, 0)
  const casesCompleted = ((caseProgressRes.data ?? []) as unknown as CaseProgressRow[]).filter(r => r.status === 'completed').length

  const profileCompletionPercent = profile ? getProfileCompletionPercent(profile as unknown as Record<string, unknown>) : 0

  return (
    <div className="dash-content">
      <MyProductSliceHeader
        avatarUrl={profile?.avatar_url ?? null}
        name={profile?.full_name ?? name}
        headline={profile?.headline ?? null}
        streak={streak}
        profileCompletionPercent={profileCompletionPercent}
        greeting={greeting}
      />

      {/* Existing members whose account predates Epic D's profile fields
          (headline, links, skills, username, ...) never went through the
          old 5-step onboarding a second time, so onboarding_done being
          true says nothing about whether these newer fields are filled
          in. Separate nudge, shown once onboarding itself is done. */}
      {profile?.onboarding_done && profileCompletionPercent < 100 && (
        <section style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.75rem',
          padding: '1.25rem 1.5rem', marginBottom: '1.75rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <p className="text-body-md" style={{ fontWeight: 700, color: 'var(--color-ink-deep)', margin: '0 0 0.375rem' }}>
              Your profile is {profileCompletionPercent}% complete
            </p>
            <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              Add a headline, your skills, and links so other members can find and recognize you.
            </p>
          </div>
          <Link href="/dashboard/settings" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Complete your profile →</Link>
        </section>
      )}

      {!profile?.onboarding_done && (
        <section style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.75rem',
          padding: '1.25rem 1.5rem', marginBottom: '1.75rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <p className="text-body-md" style={{ fontWeight: 700, color: 'var(--color-ink-deep)', margin: '0 0 0.375rem' }}>
              Finish setting up your profile
            </p>
            <p className="text-body-sm" style={{ color: 'var(--color-text-muted)', margin: '0 0 0.625rem' }}>
              {onboardingStepsDone} of 5 steps completed — unlock templates, ebook downloads, and personalized recommendations.
            </p>
            <div style={{ display: 'flex', gap: '0.25rem', maxWidth: '260px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i < onboardingStepsDone ? '#f59e0b' : '#fde68a' }} />
              ))}
            </div>
          </div>
          <Link href="/onboarding" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Continue →</Link>
        </section>
      )}

      <div style={{ marginBottom: '1.75rem' }}>
        <ContinueLearningSection path={continueLearningPath} items={continueLearningItems} />
      </div>

      {/* Live feedback (2026-09-08): Build Notes added as its own tile —
          six content types, one line. */}
      <section className="grid-collapse-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.625rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Interacted With', value: owned.length, Icon: Layers, accent: '#FACC15' },
          { label: 'Articles', value: articles.length, Icon: Newspaper, accent: '#10b981' },
          { label: 'E-books', value: ebooks.length, Icon: BookOpen, accent: '#7c3aed' },
          { label: 'Templates', value: resources.length, Icon: Package, accent: '#f97316' },
          { label: 'Build Notes', value: buildNotes.length, Icon: Wrench, accent: '#0ea5e9' },
        ].map(s => (
          <div key={s.label} style={{ background: '#ffffff', border: '1px solid color-mix(in srgb, var(--color-tertiary) 8%, transparent)', borderRadius: '0.625rem', padding: '0.875rem 0.75rem 0.75rem', borderTop: `3px solid ${s.accent}` }}>
            <s.Icon size={16} strokeWidth={2} color={s.accent} />
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-ink-deep)', margin: '0.3rem 0 0.125rem', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </section>

      <div style={{ marginBottom: '1.75rem' }}>
        <LearningActivitySection counts={{
          articlesCompleted: completedByType.article ?? 0,
          resourcesCompleted: completedByType.template ?? 0,
          ebooksRead: completedByType.ebook ?? 0,
          modulesCompleted,
          casesCompleted,
          streak,
        }} />
      </div>

      <div style={{ marginBottom: '1.75rem' }}>
        <AchievementsAndPositionRow position={communityPosition} achievements={achievements} />
      </div>

      <div style={{ marginBottom: '1.75rem' }}>
        <MyLearningPathsSection paths={myLearningPaths} />
      </div>

      <div className="grid-collapse-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <ContentListSection
          title="Recommended for You"
          items={recommended}
          emptyText="Set your topics and goals in Settings for personalized picks."
          seeAllHref={{ href: '/library', label: 'Browse library →' }}
          tracking={{ slot: 'recommended_for_you', userId: user.id }}
        />
        <ContentListSection
          title="New for You"
          items={newForYou}
          emptyText="Nothing new matching your topics yet."
          seeAllHref={{ href: '/library', label: 'Browse library →' }}
          tracking={{ slot: 'new_for_you', userId: user.id }}
        />
      </div>

      {/* Trending Now, E-books, and Templates share one row now — three
          short previews rather than a full page of scroll (live
          feedback, 2026-09-08). Everything else that used to live below
          (Saved, Recently Viewed, Courses) has a real home already:
          Saved/Recently Viewed at /dashboard/library, Courses on its own
          page once that's real content instead of a coming-soon stub. */}
      <div className="grid-collapse-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <ContentListSection
          title="Trending Now"
          items={trending.map(t => ({ id: t.id, title: t.title, type: t.type, slug: t.slug }))}
          emptyText="Nothing trending yet."
          seeAllHref={{ href: '/articles', label: 'All articles →' }}
        />
        <ContentListSection title="E-books" items={trendingEbooks.map(e => ({ id: e.id, title: e.title, type: 'ebook', slug: e.slug, tags: e.tags ?? [] }))} emptyText="No e-books yet." seeAllHref={{ href: '/library?type=ebook', label: 'All →' }} />
        <ContentListSection title="Templates" items={trendingTemplates.map(t => ({ id: t.id, title: t.title, type: 'template', slug: t.slug, tags: t.tags ?? [] }))} emptyText="No templates yet." seeAllHref={{ href: '/library?type=template', label: 'All →' }} />
      </div>

      <section style={{ paddingTop: '0.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link href="/library" className="btn-primary">Browse Library</Link>
        <Link href="/articles" className="btn-outline">Read Articles</Link>
        <Link href="/feedback" className="btn-outline">Give Feedback</Link>
      </section>
    </div>
  )
}
