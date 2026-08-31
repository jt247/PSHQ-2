# Deployment

## Branches → environments

| Branch | Environment | Vercel project(s) |
|---|---|---|
| `main` | Production | existing `pshq-2` project (unchanged), plus a new admin production project |
| `staging` | Staging | two new Vercel projects, one per app, plain `*.vercel.app` URLs — no custom domain |
| `dev` | Local only | no Vercel project — pushed freely, never auto-deployed |

Push routine work to `dev`. `staging` and `main` only move on JT's explicit
order — see [[feedback_pshq2_three_branch_workflow]] in memory.

## Vercel projects (4 total)

1. **Production web** — the existing `pshq-2` project. Deploys from `main`.
   Root Directory needs to change from repo root to `apps/web` — see
   **the one thing that has to happen before `main` gets pushed**, below.
2. **Production admin** — new project, to be created. Deploys from `main`,
   Root Directory `apps/admin`. Domain: `admin.productslicehq.com`.
3. **Staging web** — new project. Deploys from `staging`, Root Directory
   `apps/web`. No custom domain.
4. **Staging admin** — new project. Deploys from `staging`, Root Directory
   `apps/admin`. No custom domain.

Each project's env vars are configured in its own Vercel dashboard —
`.env.production.example` and `.env.staging.example` in `apps/web/` and
`apps/admin/` are copy-paste references for that, not files Next.js loads
automatically (Next only auto-loads `.env`, `.env.local`, `.env.production`,
`.env.development` — there's no built-in "staging" environment concept, so
the separation is "two different Vercel projects," not "two different env
files read at runtime").

## Domains (production only — staging stays on `*.vercel.app`)

| Surface | Domain |
|---|---|
| Web | `productslicehq.com` (already live, unchanged) |
| Admin | `admin.productslicehq.com` |
| Mobile (deep links / universal links, once needed) | `app.productslicehq.com` |
| Backend API | `api.productslicehq.com` — reserved, nothing deployed there yet. There's no service to point it at: all backend logic today is Next.js API routes living inside `apps/web` and `apps/admin` themselves. Wire this up if/when a separate backend service actually gets built — until then it's a placeholder, not a live endpoint. |

Mobile staging: no separate environment planned — JT will use EAS
(`expo.dev`) directly, TestFlight/Play internal testing ahead of each real
release, same as any Expo app's normal release flow.

## The one thing that has to happen before `main` gets pushed

The existing production Vercel project currently builds from the repo root
as a plain Next.js app. The app now lives at `apps/web` — if `main` gets
the monorepo restructure before that project's **Root Directory** setting
changes to `apps/web`, the next automatic production deploy almost
certainly fails (or builds the wrong thing), because Vercel's git
integration deploys on every push to a project's production branch by
default.

**Sequence that avoids that:**
1. JT updates the existing production project's Root Directory to
   `apps/web` in the Vercel dashboard (Settings → General).
2. Push `main` (or trigger a redeploy) only after that setting is saved.

Nothing about step 1 affects what's currently live — Vercel doesn't
rebuild anything just because a setting changed. It only matters for the
*next* deploy, which is why the order above is safe and reversible right
up until step 2 actually happens.
