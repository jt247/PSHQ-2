-- ----------------------------------------------------------
-- Epic E: AI & Personalization Layer — schema additions
--
-- Confirmed during discovery: the `recommendations` and `ai_interactions`
-- tables the build prompt assumed exist from Build Prompt 1 were never
-- actually built (same pattern as Epic D's discovery) — this migration
-- creates ai_interactions fresh. The rules-based recommendation stub
-- (Build Prompt 2/5) needs no schema change, it already reads real
-- metadata columns.
-- ----------------------------------------------------------

-- ----------------------------------------------------------
-- ai_interactions — one row per AI call across every Epic E feature
-- (Create My Learning Path, recommendation re-ranking, Continue From
-- Here, the content assistance actions). Standing rule: every AI output
-- must be traceable; this is that trace.
-- ----------------------------------------------------------
create type public.ai_feature as enum ('learning_path', 'recommendation', 'continue_from_here', 'content_assistance');

create table public.ai_interactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references public.users (id) on delete set null,
  feature             public.ai_feature not null,
  input_context       jsonb not null default '{}',
  retrieved_content_ids uuid[] not null default '{}',
  output              jsonb,
  validation_passed   boolean not null default true,
  rejected_ids        uuid[] not null default '{}',
  model_used          text,
  created_at          timestamptz not null default now()
);

alter table public.ai_interactions enable row level security;

create policy "ai_interactions: self read"
  on public.ai_interactions for select
  using (auth.uid() = user_id);

create policy "ai_interactions: admin read"
  on public.ai_interactions for select
  using (public.is_admin());

create policy "ai_interactions: self insert"
  on public.ai_interactions for insert
  with check (auth.uid() = user_id or user_id is null);

create index on public.ai_interactions (user_id);
create index on public.ai_interactions (feature);
create index ai_interactions_validation_failed_idx on public.ai_interactions (created_at) where validation_passed = false;


-- ----------------------------------------------------------
-- learning_paths additions — Create My Learning Path (E.1-E.3) reuses this
-- table rather than a parallel one, per the prompt's own instruction.
-- source distinguishes JT-curated paths (shown in the public /learning-
-- paths index) from a member's private AI-generated one (never shown
-- there — self-read only, see the new policy below).
-- ----------------------------------------------------------
alter table public.learning_paths
  add column if not exists created_by uuid references public.users (id) on delete cascade,
  add column if not exists source text not null default 'curated' check (source in ('curated', 'ai_generated')),
  add column if not exists goal_summary text,
  add column if not exists weekly_time_commitment_minutes integer,
  add column if not exists target_timeline_weeks integer,
  add column if not exists milestones text[] not null default '{}',
  add column if not exists completion_criteria text;

comment on column public.learning_paths.source is 'curated = JT-authored, shown publicly. ai_generated = one member''s private Create My Learning Path output, self-read only regardless of status.';

-- A custom path's own creator can always read it, independent of status —
-- the existing "learning_paths: public read" policy (status = 'published'
-- only) stays untouched, this is additive (multiple permissive policies
-- OR together in Postgres RLS).
create policy "learning_paths: self read own"
  on public.learning_paths for select
  using (created_by = auth.uid());

create index on public.learning_paths (created_by) where created_by is not null;


-- ----------------------------------------------------------
-- ai_content_assistance — cache for the three new per-article actions
-- (Key Takeaways, Action Checklist, Questions to Reflect). Summarize
-- keeps using the existing ai_summaries table/UI unchanged (JT decision,
-- 2026-09-01: the existing 2-3 sentence + bullets + concepts format is
-- kept as-is, not rewritten to a longer paragraph format — it already
-- works and he prefers it). Explain Simply is dropped entirely (JT
-- decision, same date) — not built, not part of this table's action_type
-- enum, so there's no dead slot for it to ever accidentally fill.
--
-- content_updated_snapshot is the cache-invalidation mechanism: a cached
-- row is stale exactly when content.updated_at has moved past it, which
-- the app checks on read rather than needing a trigger.
-- ----------------------------------------------------------
create type public.content_assistance_action as enum ('key_takeaways', 'action_checklist', 'reflection_questions');

create table public.ai_content_assistance (
  id                      uuid primary key default gen_random_uuid(),
  content_id              uuid not null references public.content (id) on delete cascade,
  action_type             public.content_assistance_action not null,
  output                  jsonb not null,
  model_used              text not null,
  content_updated_snapshot timestamptz not null,
  requested_by            uuid references public.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  unique (content_id, action_type)
);

alter table public.ai_content_assistance enable row level security;

create policy "ai_content_assistance: public read"
  on public.ai_content_assistance for select
  using (exists (select 1 from public.content c where c.id = content_id and c.status = 'published'));

create policy "ai_content_assistance: auth upsert"
  on public.ai_content_assistance for insert
  with check (auth.uid() is not null);

create policy "ai_content_assistance: auth update"
  on public.ai_content_assistance for update
  using (auth.uid() is not null);

create policy "ai_content_assistance: admin full access"
  on public.ai_content_assistance for all
  using (public.is_admin())
  with check (public.is_admin());

create index on public.ai_content_assistance (content_id);


-- ----------------------------------------------------------
-- content_gaps — Step 5's "log content gaps somewhere JT can review."
-- A full admin dashboard is Epic H; this is the minimum real logging: one
-- row every time retrieval comes back too thin for a request to be
-- answered well, so it's queryable now and buildable-on later.
-- ----------------------------------------------------------
create table public.content_gaps (
  id            uuid primary key default gen_random_uuid(),
  feature       public.ai_feature not null,
  user_id       uuid references public.users (id) on delete set null,
  context       jsonb not null default '{}',
  note          text,
  created_at    timestamptz not null default now()
);

alter table public.content_gaps enable row level security;

create policy "content_gaps: admin read"
  on public.content_gaps for select
  using (public.is_admin());

create policy "content_gaps: auth insert"
  on public.content_gaps for insert
  with check (auth.uid() is not null or user_id is null);
