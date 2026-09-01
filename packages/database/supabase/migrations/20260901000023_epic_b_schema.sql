-- ----------------------------------------------------------
-- Epic B: Content Library & Knowledge System — schema
--
-- Additive only. No existing content row's id/slug/type changes, so every
-- live article/ebook/template/guide URL keeps resolving exactly as before.
--
-- New enum values that get USED by inserts (content_type additions) are
-- deliberately kept in this file with no usage — Postgres forbids using a
-- newly added enum value in the same transaction it was added (see the
-- precedent in migrations 003/021). The next migration file is where
-- 'guide' and 'build_note' actually get used.
-- ----------------------------------------------------------

alter type public.content_type add value if not exists 'guide';
alter type public.content_type add value if not exists 'build_note';


-- ----------------------------------------------------------
-- domain — fixed six-value taxonomy from the product vision. Deliberately
-- NOT user-editable/growable the way Topics are, per spec.
-- ----------------------------------------------------------
create type public.content_domain as enum ('product', 'growth', 'ai', 'building', 'careers', 'leadership');

create type public.progress_status as enum ('not_started', 'in_progress', 'completed');

create type public.exercise_type as enum (
  'text_response', 'multiple_choice', 'checklist', 'self_assessment', 'template_completion', 'reflection'
);


-- ----------------------------------------------------------
-- content — new metadata columns (Step 1). level reuses Epic A's
-- experience_level enum rather than inventing a second scale.
-- ----------------------------------------------------------
alter table public.content
  add column if not exists domain              public.content_domain,
  add column if not exists level               public.experience_level,
  add column if not exists resource_category   text,
  add column if not exists estimated_time_minutes integer,
  add column if not exists resource_intent     text[] not null default '{}',
  add column if not exists needs_review        boolean not null default false,
  add column if not exists seo_title           text,
  add column if not exists seo_description     text,
  add column if not exists canonical_url       text,
  add column if not exists og_image_url        text;

comment on column public.content.needs_review is 'Editorial flag (Step 10) — lets an editor filter to "needs a refresh" without a full CMS. Never set by end users.';
comment on column public.content.resource_intent is 'Array, not a join table — small fixed vocabulary (Learn/Build/Plan/Evaluate/Practice/Prepare/Get hired/Lead/Grow), doesn''t need referential integrity.';


-- ----------------------------------------------------------
-- series — first-class content relationship (Step 8)
-- ----------------------------------------------------------
create table public.series (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  description   text,
  cover_image_url text,
  status        public.content_status not null default 'draft',
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.content
  add column if not exists series_id uuid references public.series (id) on delete set null;

create table public.series_items (
  id          uuid primary key default gen_random_uuid(),
  series_id   uuid not null references public.series (id) on delete cascade,
  content_id  uuid not null references public.content (id) on delete cascade,
  sequence    integer not null default 0,
  unique (series_id, content_id)
);

alter table public.series enable row level security;
alter table public.series_items enable row level security;
create policy "series: public read" on public.series for select using (status = 'published');
create policy "series_items: public read" on public.series_items for select using (true);

create index on public.series_items (series_id, sequence);


-- ----------------------------------------------------------
-- Content ↔ Topics / Goals / Roles — reuses the exact tables Epic A
-- already built for onboarding (roles/goals/topics), just joins them to
-- content instead of users. Per Data Model Principles (§113): no parallel
-- taxonomy tables for the same concepts.
-- ----------------------------------------------------------
create table public.content_topics (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references public.content (id) on delete cascade,
  topic_id    uuid not null references public.topics (id) on delete cascade,
  unique (content_id, topic_id)
);

create table public.content_goals (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references public.content (id) on delete cascade,
  goal_id     uuid not null references public.goals (id) on delete cascade,
  unique (content_id, goal_id)
);

create table public.content_roles (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references public.content (id) on delete cascade,
  role_id     uuid not null references public.roles (id) on delete cascade,
  unique (content_id, role_id)
);

alter table public.content_topics enable row level security;
alter table public.content_goals enable row level security;
alter table public.content_roles enable row level security;
create policy "content_topics: public read" on public.content_topics for select using (true);
create policy "content_goals: public read" on public.content_goals for select using (true);
create policy "content_roles: public read" on public.content_roles for select using (true);

create index on public.content_topics (topic_id);
create index on public.content_goals (goal_id);
create index on public.content_roles (role_id);


-- ----------------------------------------------------------
-- Learning Paths (Step 4)
-- ----------------------------------------------------------
create table public.learning_paths (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  title                 text not null,
  description           text,
  target_audience       text,
  level                 public.experience_level,
  estimated_time_minutes integer,
  outcomes              text[] not null default '{}',
  prerequisites         text[] not null default '{}',
  status                public.content_status not null default 'draft',
  display_order         integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table public.learning_path_goals (
  id                uuid primary key default gen_random_uuid(),
  learning_path_id  uuid not null references public.learning_paths (id) on delete cascade,
  goal_id           uuid not null references public.goals (id) on delete cascade,
  unique (learning_path_id, goal_id)
);

-- Modules may reference an existing Content row (article/ebook/template/
-- case study/etc.) OR stand alone with just a title if there's nothing to
-- link yet (e.g. a "Video" or "Product Lab replay" module type with no
-- Content row backing it). content_id is nullable for that reason.
create table public.learning_path_modules (
  id                uuid primary key default gen_random_uuid(),
  learning_path_id  uuid not null references public.learning_paths (id) on delete cascade,
  content_id        uuid references public.content (id) on delete set null,
  title             text not null,
  description       text,
  is_required       boolean not null default true,
  sequence          integer not null default 0,
  created_at        timestamptz not null default now()
);

create table public.user_learning_paths (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users (id) on delete cascade,
  learning_path_id  uuid not null references public.learning_paths (id) on delete cascade,
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  unique (user_id, learning_path_id)
);

create table public.module_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  module_id   uuid not null references public.learning_path_modules (id) on delete cascade,
  status      public.progress_status not null default 'not_started',
  completed_at timestamptz,
  updated_at  timestamptz not null default now(),
  unique (user_id, module_id)
);

alter table public.learning_paths enable row level security;
alter table public.learning_path_goals enable row level security;
alter table public.learning_path_modules enable row level security;
alter table public.user_learning_paths enable row level security;
alter table public.module_progress enable row level security;

create policy "learning_paths: public read" on public.learning_paths for select using (status = 'published');
create policy "learning_path_goals: public read" on public.learning_path_goals for select using (true);
create policy "learning_path_modules: public read" on public.learning_path_modules for select using (true);
create policy "user_learning_paths: self read" on public.user_learning_paths for select using (auth.uid() = user_id);
create policy "user_learning_paths: self insert" on public.user_learning_paths for insert with check (auth.uid() = user_id);
create policy "user_learning_paths: self update" on public.user_learning_paths for update using (auth.uid() = user_id);
create policy "module_progress: self read" on public.module_progress for select using (auth.uid() = user_id);
create policy "module_progress: self insert" on public.module_progress for insert with check (auth.uid() = user_id);
create policy "module_progress: self update" on public.module_progress for update using (auth.uid() = user_id);

create index on public.learning_path_modules (learning_path_id, sequence);
create index on public.module_progress (user_id);


-- ----------------------------------------------------------
-- Collections (Step 5) — curated bundles, no sequencing requirement, but
-- keep a display order for the bundle's own presentation.
-- ----------------------------------------------------------
create table public.collections (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  description   text,
  cover_image_url text,
  status        public.content_status not null default 'draft',
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.collection_items (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  content_id    uuid not null references public.content (id) on delete cascade,
  display_order integer not null default 0,
  unique (collection_id, content_id)
);

create table public.collection_favorites (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (collection_id, user_id)
);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.collection_favorites enable row level security;

create policy "collections: public read" on public.collections for select using (status = 'published');
create policy "collection_items: public read" on public.collection_items for select using (true);
create policy "collection_favorites: self read" on public.collection_favorites for select using (auth.uid() = user_id);
create policy "collection_favorites: self insert" on public.collection_favorites for insert with check (auth.uid() = user_id);
create policy "collection_favorites: self delete" on public.collection_favorites for delete using (auth.uid() = user_id);

create index on public.collection_items (collection_id, display_order);


-- ----------------------------------------------------------
-- Content Exercises (Step 9)
-- ----------------------------------------------------------
create table public.exercises (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references public.content (id) on delete cascade,
  type        public.exercise_type not null,
  prompt      text not null,
  options     jsonb,
  sequence    integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.exercise_responses (
  id            uuid primary key default gen_random_uuid(),
  exercise_id   uuid not null references public.exercises (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  response      jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (exercise_id, user_id)
);

alter table public.exercises enable row level security;
alter table public.exercise_responses enable row level security;

create policy "exercises: public read" on public.exercises for select using (true);
-- Exercise responses are explicitly never public (Step 9/§58) — self only,
-- no admin-read policy either, matching "never expose publicly."
create policy "exercise_responses: self read" on public.exercise_responses for select using (auth.uid() = user_id);
create policy "exercise_responses: self insert" on public.exercise_responses for insert with check (auth.uid() = user_id);
create policy "exercise_responses: self update" on public.exercise_responses for update using (auth.uid() = user_id);
create policy "exercise_responses: self delete" on public.exercise_responses for delete using (auth.uid() = user_id);

create index on public.exercises (content_id, sequence);


-- ----------------------------------------------------------
-- content_progress — generic completion tracking for any content row
-- (articles/ebooks/templates/guides/build notes), separate from
-- module_progress (which is learning-path-scoped).
-- ----------------------------------------------------------
create table public.content_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  content_id  uuid not null references public.content (id) on delete cascade,
  status      public.progress_status not null default 'not_started',
  completed_at timestamptz,
  updated_at  timestamptz not null default now(),
  unique (user_id, content_id)
);

alter table public.content_progress enable row level security;
create policy "content_progress: self read" on public.content_progress for select using (auth.uid() = user_id);
create policy "content_progress: self insert" on public.content_progress for insert with check (auth.uid() = user_id);
create policy "content_progress: self update" on public.content_progress for update using (auth.uid() = user_id);

create index on public.content_progress (user_id);


-- ----------------------------------------------------------
-- updated_at triggers for the new tables that need them
-- ----------------------------------------------------------
create trigger series_updated_at before update on public.series for each row execute function public.touch_updated_at();
create trigger collections_updated_at before update on public.collections for each row execute function public.touch_updated_at();
create trigger learning_paths_updated_at before update on public.learning_paths for each row execute function public.touch_updated_at();
