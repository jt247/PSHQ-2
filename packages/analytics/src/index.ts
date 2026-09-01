import type { SupabaseClient } from '@supabase/supabase-js'

// Typed analytics event tracker. Every call site uses a named helper
// (trackSignupCompleted(...), not track('signup_completed', {...})) so a
// typo in an event name is a compile error, not a silently-missing row.
//
// Writes to `analytics_events` (packages/database migration
// 20260901000022) by default. The seam to swap in a real provider later
// (PostHog server-side capture, Segment, whatever) without touching call
// sites: change what `track()` does internally, not any of the exported
// helpers below or their signatures.

export type ContentType = 'article' | 'ebook' | 'template' | 'course'
export type EventSource = 'web' | 'mobile'

interface TrackContext {
  supabase: SupabaseClient
  userId?: string | null
  anonymousId?: string | null
  sessionId?: string | null
  source: EventSource
  device?: string | null
}

interface TrackOptions {
  contentId?: string | null
  contentType?: ContentType | null
  metadata?: Record<string, unknown>
}

async function track(ctx: TrackContext, eventName: string, opts: TrackOptions = {}): Promise<void> {
  try {
    await ctx.supabase.from('analytics_events').insert({
      event_name: eventName,
      user_id: ctx.userId ?? null,
      anonymous_id: ctx.anonymousId ?? null,
      content_id: opts.contentId ?? null,
      content_type: opts.contentType ?? null,
      session_id: ctx.sessionId ?? null,
      source: ctx.source,
      device: ctx.device ?? null,
      metadata: opts.metadata ?? {},
    })
  } catch { /* analytics is never allowed to break the feature it's measuring */ }
}

// ── Signup & auth ────────────────────────────────────────────────────────
export const trackSignupStarted = (ctx: TrackContext) => track(ctx, 'signup_started')
export const trackSignupCompleted = (ctx: TrackContext) => track(ctx, 'signup_completed')
export const trackEmailVerified = (ctx: TrackContext) => track(ctx, 'email_verified')

// ── Onboarding ───────────────────────────────────────────────────────────
export const trackOnboardingStarted = (ctx: TrackContext) => track(ctx, 'onboarding_started')
export const trackOnboardingStepCompleted = (ctx: TrackContext, step: string) =>
  track(ctx, 'onboarding_step_completed', { metadata: { step } })
export const trackOnboardingCompleted = (ctx: TrackContext) => track(ctx, 'onboarding_completed')

// ── Content ──────────────────────────────────────────────────────────────
export const trackContentImpression = (ctx: TrackContext, opts: TrackOptions) => track(ctx, 'content_impression', opts)
export const trackContentOpened = (ctx: TrackContext, opts: TrackOptions) => track(ctx, 'content_opened', opts)
export const trackContentProgress = (ctx: TrackContext, opts: TrackOptions & { metadata: { percent: number } }) =>
  track(ctx, 'content_progress', opts)
export const trackContentCompleted = (ctx: TrackContext, opts: TrackOptions) => track(ctx, 'content_completed', opts)
export const trackResourceDownloaded = (ctx: TrackContext, opts: TrackOptions) => track(ctx, 'resource_downloaded', opts)
export const trackResourceSaved = (ctx: TrackContext, opts: TrackOptions) => track(ctx, 'resource_saved', opts)
export const trackResourceShared = (ctx: TrackContext, opts: TrackOptions) => track(ctx, 'resource_shared', opts)

// ── Learning (Epic B builds the features these describe) ───────────────
export const trackLearningPathStarted = (ctx: TrackContext, opts: TrackOptions) => track(ctx, 'learning_path_started', opts)
export const trackLearningModuleCompleted = (ctx: TrackContext, opts: TrackOptions) => track(ctx, 'learning_module_completed', opts)
export const trackLearningPathCompleted = (ctx: TrackContext, opts: TrackOptions) => track(ctx, 'learning_path_completed', opts)
export const trackExerciseCompleted = (ctx: TrackContext, opts: TrackOptions) => track(ctx, 'exercise_completed', opts)

// ── AI (Epic E) ──────────────────────────────────────────────────────────
export const trackAiSummaryRequested = (ctx: TrackContext, opts: TrackOptions) => track(ctx, 'ai_summary_requested', opts)
export const trackAiLearningPathCreated = (ctx: TrackContext, opts: TrackOptions) => track(ctx, 'ai_learning_path_created', opts)

// ── Feedback & search ────────────────────────────────────────────────────
export const trackFeedbackSubmitted = (ctx: TrackContext, metadata?: Record<string, unknown>) =>
  track(ctx, 'feedback_submitted', { metadata })
export const trackSearchPerformed = (ctx: TrackContext, query: string, resultCount: number) =>
  track(ctx, 'search_performed', { metadata: { query, resultCount } })
export const trackSearchZeroResults = (ctx: TrackContext, query: string) =>
  track(ctx, 'search_zero_results', { metadata: { query } })

// ── Homepage (Epic C) ────────────────────────────────────────────────────
export const trackHomepageSectionViewed = (ctx: TrackContext, section: string) =>
  track(ctx, 'homepage_section_viewed', { metadata: { section } })
export const trackCtaClicked = (ctx: TrackContext, section: string, label: string) =>
  track(ctx, 'cta_clicked', { metadata: { section, label } })

// ── My ProductSlice dashboard & profile (Epic D) ────────────────────────
// content_marked_complete is deliberately separate from
// trackContentCompleted above: that event already fires from the generic
// per-content completion action for any surface; this one is specific to
// the dashboard/reading-flow completion moments this epic adds (manual
// button + automatic scroll/dwell detection), tagged with how it happened
// so the two paths are distinguishable in the data.
export const trackDashboardViewed = (ctx: TrackContext) => track(ctx, 'dashboard_viewed')
export const trackProfileViewed = (ctx: TrackContext, profileUserId: string) =>
  track(ctx, 'profile_viewed', { metadata: { profileUserId } })
export const trackProfileUpdated = (ctx: TrackContext, fieldsChanged: string[]) =>
  track(ctx, 'profile_updated', { metadata: { fieldsChanged } })
export const trackContentMarkedComplete = (ctx: TrackContext, opts: TrackOptions & { metadata: { auto: boolean } }) =>
  track(ctx, 'content_marked_complete', opts)
export const trackNotificationPreferenceUpdated = (ctx: TrackContext, key: string, enabled: boolean) =>
  track(ctx, 'notification_preference_updated', { metadata: { key, enabled } })

export type { TrackContext, TrackOptions }
