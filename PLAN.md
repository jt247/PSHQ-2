# PSHQ-2 → ProductSlice HQ 2.0 — Migration Plan

Written on the `dev` branch per the three-branch workflow (dev freely, staging
and main only on JT's order). Do not execute Step 1 until this plan is
approved.

## Discovery — current state (verified 2026-08-31)

1. **Framework**: Next.js 16.2.9, App Router (`src/app`), React 19.2.4.
2. **Package manager**: pnpm already, but no real workspace config —
   `pnpm-workspace.yaml` only lists `allowBuilds` entries, no `packages:`
   list. No `turbo.json`.
3. **Backend**: Supabase (Postgres + Auth + Storage) already fully in use.
   Extensive RLS-protected schema: `content`, `content_interactions`,
   `content_comments`, `content_upvotes`, `content_favorites`, `ratings`,
   `ai_summaries`, `notifications`, `notification_recipients`, support
   tickets, admin logs, and more — built up across this and prior sessions,
   not a fresh install.
4. **Auth**: Supabase Auth — email/password plus Google OAuth (Supabase
   brokers the OAuth redirect). Post-signup onboarding collects job role,
   country, and areas of interest.
5. **Folder structure**: `src/app/(public)` — homepage, articles, content
   detail, library, initiatives. `src/app/(auth)` — sign-in/up, password
   reset. `src/app/dashboard` — user dashboard, My Library, settings,
   support, requests. `src/app/admin` — admin panel and analytics.
   `src/app/api` — route handlers.
6. **Deployment**: Vercel, project linked (`.vercel/project.json`), no
   `vercel.json` — builds from repo root via dashboard defaults. No CI
   (no `.github`).
7. **Analytics**: PostHog (`posthog-js` + `posthog-node`) already wired for
   product analytics, plus a custom `content_interactions` table feeding
   the in-app admin analytics dashboards. Sentry for error tracking. No
   unified typed event-tracking wrapper yet.
8. **Mobile**: confirmed — no mobile app anywhere in this repo or any
   sibling repo in ProductLabs.

## Decisions locked before writing this plan

- **Branches**: `dev` (free), `staging` (JT's order only), `main`
  (production — JT's order or JT does it). This plan and Step 1 land on
  `dev`.
- **App split**: one `apps/web`, not split into separate landing/app repos.
  The existing route groups already separate public/auth/dashboard/admin
  concerns; splitting into two Next.js apps would add cross-app auth and
  deploy complexity with no concrete driver yet. Revisit later if a real
  reason shows up (team split, independent scaling need).
- **Schema strategy**: extend existing tables in place, don't rebuild.
  `content` *is* `Content`, `content_favorites` *is* `Favorite`, `ratings`
  *is* `Rating`, `content_comments` *is* `Comment`, `notifications` *is*
  `Notification`, `users` *is* `User`+`Profile` (no split). No data
  migration between equivalent tables — only what's genuinely missing gets
  added (Topic, Goal, Role, LearningPath, Collection, CaseStudy,
  Achievement, and the rest are net-new).
- **Role**: audience/job-role segmentation (Product Manager, Founder,
  Designer) for content targeting — a structured version of the existing
  free-text `job_role` field. Fully separate from `users.role`
  (admin/user/super_admin), which is untouched.
- **Topic backfill**: normalize existing `content.tags` into real `Topic`
  rows now, one per unique existing tag string, linked via a new
  `content_topics` join table.

## Step 1 plan — monorepo restructure

**Goal**: move the existing app into `apps/web` with zero behavioral
regressions, scaffold `apps/mobile` and the five `packages/*` workspaces,
without touching `main` or production.

1. Add `turbo.json` and expand `pnpm-workspace.yaml` to a real
   `packages: [apps/*, packages/*]` list.
2. `git mv` the app's existing files into `apps/web/` (imports, `tsconfig`
   paths, and Tailwind/PostCSS config move with it — no rewrites, just
   relocation). Root `package.json` becomes the workspace root; `apps/web`
   gets its own `package.json` with the current dependencies.
3. Scaffold `apps/mobile` — Expo (TypeScript), bottom tab navigator, five
   placeholder tab screens (Home, Learn, Library, Community, Profile), no
   real logic yet.
4. Scaffold `packages/ui`, `packages/database`, `packages/api-client`,
   `packages/analytics`, `packages/config` with minimal working content —
   `packages/ui` starts with design tokens extracted from `apps/web`'s
   existing CSS custom properties (colors, spacing, type scale) as the
   single source of truth both apps import from.
5. Confirm `pnpm dev` runs `apps/web` with no regressions, and
   `pnpm --filter mobile start` boots Expo.
6. Commit to `dev`, push. **Not staging or main.**

### The one manual step this needs from JT, before staging can build

Vercel's current project config builds from the repo root as a plain
Next.js app. Once the app lives in `apps/web`, that config needs to point
at the new location: in the Vercel dashboard → Project Settings → General
→ Root Directory, set it to `apps/web`. Vercel's monorepo detection (it
looks up the tree for the pnpm lockfile and `turbo.json`) handles the
install/build correctly from there — no other setting should need to
change.

This is safe to do at any time: **changing that setting does not affect
what's currently live** — production keeps serving whatever was last
successfully deployed to `main` until a new deployment actually happens
against `main`. It only needs to be set before a `dev`/`staging` branch
preview deployment of the restructured app will build successfully, since
preview deployments use the same project settings as production.

**When you're ready to test**: push `dev` to `staging` (or ask me to), then
update that Root Directory setting, then trigger the deploy. If the preview
looks wrong, the setting is fully reversible with no impact to `main`.

### What could break, and how it's avoided

- **Import paths / tsconfig**: moving files without touching imports means
  relative imports inside `apps/web` keep working as-is; only root-level
  config (`tsconfig.json`, `next.config.ts`, `tailwind` config) needs its
  paths re-anchored to the new location, which I'll verify with a clean
  `pnpm --filter web build` before considering Step 1 done.
- **Environment variables**: `.env.local` moves to `apps/web/.env.local`
  (Next.js only reads env files from the app's own directory). Vercel's
  configured environment variables aren't affected by the file move — they
  attach to the project, not a path — but once Root Directory changes to
  `apps/web`, double-check they're still being read (they should be; this
  is standard Vercel monorepo behavior).
- **Vercel build failing on `main`**: never happens as a side effect of
  this work, because Step 1 never touches `main`, and the Root Directory
  setting change (above) doesn't retroactively rebuild what's already live.
- **Sentry / PostHog tunnel routes**: `next.config.ts`'s Sentry tunnel
  route and CSP headers move with the app into `apps/web` unchanged — no
  reason for these to behave differently post-move, but I'll spot-check
  the CSP headers and `/monitoring` tunnel still respond correctly in the
  `dev` build before calling Step 1 done.

## Steps 2–6

Schema extension (Step 2), the typed analytics package (Step 3), the five
P0 platform fixes (Step 4), SEO baseline (Step 5), and cross-cutting
standards (Step 6) all build on top of Step 1 and will each get their own
short plan/report as they land — no need to front-load every detail here
before Step 1 is even approved. Broad shape, so the size of the work is
visible up front:

- **Step 2**: extend `users`, add `profiles`-equivalent fields where
  missing (none expected, given the extend-in-place decision), add `role`
  (job-role/audience, new table + join), `goals` (new), `topics` (new,
  backfilled from existing tags) + `content_topics` join, and schema
  skeletons (table + key columns + relationships only, no full field sets)
  for LearningPath, LearningPathModule, UserLearningPath, ModuleProgress,
  Collection, CollectionItem, CaseStudy, ProductLabEdition, Exercise,
  ExerciseResponse, ContentProgress, Achievement, UserAchievement,
  ContributionEvent, LeaderboardScore, Recommendation, AIInteraction,
  Feedback, NotificationPreference, SearchEvent, Digest. `AnalyticsEvent`
  gets its own real table (Step 3 needs it) rather than reusing
  `content_interactions`, since the normalized event shape in the brief
  (session_id, anonymous_id, device, source, metadata) is meaningfully
  different from what `content_interactions` stores today — the existing
  table keeps doing what it does, `analytics_events` is additive.
- **Step 3**: `packages/analytics` typed `track()` wrapper writing to the
  new `analytics_events` table, with helpers for every event listed in the
  brief.
- **Step 4**: the five P0 fixes, executed as real code changes with a
  grep-verified sweep for view counts and CTAs, not a checklist.
- **Step 5**: sitemap/robots/canonicals/JSON-LD helpers.
- **Step 6**: skeleton components, `eslint-plugin-jsx-a11y`, privacy
  scaffolding (schema + stub routes only).

## Approval gate

Per the brief: **no structural changes happen until this plan is
approved.** Once you give the go-ahead, Step 1 lands on `dev` only.
