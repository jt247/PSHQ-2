-- ----------------------------------------------------------
-- Epic A: Onboarding & Authentication — data model
--
-- Extends the existing `users` table in place rather than introducing a
-- separate `profiles` table (locked decision, see PLAN.md) — `users` IS
-- both User and Profile here. `users.role` (admin/user/super_admin,
-- permission role) is untouched; `primary_role_id` below is a completely
-- separate concept — job-function role (Product Manager, Founder, ...)
-- used for audience segmentation and content targeting.
-- ----------------------------------------------------------

create type public.experience_level as enum ('exploring', 'beginner', 'intermediate', 'senior', 'leader');
create type public.privacy_tier as enum ('public', 'community', 'private');

alter table public.users
  add column if not exists company           text,
  add column if not exists region            text,
  add column if not exists headline          text,
  add column if not exists linkedin_url      text,
  add column if not exists website_url       text,
  add column if not exists portfolio_url     text,
  add column if not exists github_url        text,
  add column if not exists x_url             text,
  add column if not exists skills            text[] not null default '{}',
  add column if not exists career_focus      text,
  add column if not exists years_experience  integer,
  add column if not exists experience_level  public.experience_level,
  add column if not exists privacy_tier      public.privacy_tier not null default 'community';

comment on column public.users.job_role is 'Current job title (free text) — e.g. "Senior PM at Acme". Distinct from primary_role_id, which is the fixed onboarding role select.';
comment on column public.users.privacy_tier is 'public = discoverable outside the app, community = visible to signed-in members only, private = hidden from other users.';


-- ----------------------------------------------------------
-- roles — fixed primary/secondary role taxonomy (Epic A.6)
-- ----------------------------------------------------------
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort_order  integer not null default 0
);

alter table public.roles enable row level security;
create policy "roles: public read" on public.roles for select using (true);

insert into public.roles (name, sort_order) values
  ('Product Manager', 1), ('Founder', 2), ('Product Designer', 3), ('Engineer', 4),
  ('Product Marketer', 5), ('Growth Professional', 6), ('Product Operations', 7),
  ('Project Manager', 8), ('Student', 9), ('Career Switcher', 10),
  ('Product Leader', 11), ('Other', 12);

alter table public.users
  add column if not exists primary_role_id uuid references public.roles (id) on delete set null;

-- Secondary roles/interests — same taxonomy, multi-select, explicitly
-- separate from the single primary_role_id per Epic A.6.
create table public.user_secondary_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  role_id     uuid not null references public.roles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, role_id)
);

alter table public.user_secondary_roles enable row level security;
create policy "user_secondary_roles: self read" on public.user_secondary_roles for select using (auth.uid() = user_id);
create policy "user_secondary_roles: self insert" on public.user_secondary_roles for insert with check (auth.uid() = user_id);
create policy "user_secondary_roles: self delete" on public.user_secondary_roles for delete using (auth.uid() = user_id);


-- ----------------------------------------------------------
-- goals — fixed taxonomy, multi-select up to 5 (Epic A.8)
-- ----------------------------------------------------------
create table public.goals (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort_order  integer not null default 0
);

alter table public.goals enable row level security;
create policy "goals: public read" on public.goals for select using (true);

insert into public.goals (name, sort_order) values
  ('Break into product', 1), ('Improve my product craft', 2), ('Learn AI', 3),
  ('Become an AI Product Manager', 4), ('Become more technical', 5), ('Build a startup', 6),
  ('Build a software product', 7), ('Improve GTM', 8), ('Learn growth', 9),
  ('Improve product leadership', 10), ('Build my portfolio', 11), ('Find a product job', 12),
  ('Prepare for interviews', 13), ('Learn software engineering', 14), ('Build with AI', 15),
  ('Improve product marketing', 16);

create table public.user_goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  goal_id     uuid not null references public.goals (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, goal_id)
);

alter table public.user_goals enable row level security;
create policy "user_goals: self read" on public.user_goals for select using (auth.uid() = user_id);
create policy "user_goals: self insert" on public.user_goals for insert with check (auth.uid() = user_id);
create policy "user_goals: self delete" on public.user_goals for delete using (auth.uid() = user_id);

-- Max 5 goals per user, enforced server-side (trigger, not just app code —
-- app-layer validation is bypassable by anyone calling the API directly).
create or replace function public.enforce_max_user_goals()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.user_goals where user_id = new.user_id) >= 5 then
    raise exception 'Maximum of 5 goals per user.';
  end if;
  return new;
end;
$$;

create trigger check_max_user_goals
  before insert on public.user_goals
  for each row execute procedure public.enforce_max_user_goals();


-- ----------------------------------------------------------
-- topics — fixed taxonomy, multi-select (Epic A.9, renamed from
-- "Interests"). Separate from the existing free-text `areas_of_interest`
-- column, which is left in place, untouched, as legacy data — some of its
-- values (industry verticals like "Fintech", "B2B SaaS") don't map onto
-- this new fixed list at all, so nothing is deleted, just superseded going
-- forward. See migration data backfill below for what does carry over.
-- ----------------------------------------------------------
create table public.topics (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort_order  integer not null default 0
);

alter table public.topics enable row level security;
create policy "topics: public read" on public.topics for select using (true);

insert into public.topics (name, sort_order) values
  ('Product Strategy', 1), ('Product Discovery', 2), ('User Research', 3),
  ('Product Analytics', 4), ('Product Operations', 5), ('Growth', 6),
  ('GTM', 7), ('Product Marketing', 8), ('AI Product Management', 9),
  ('AI Engineering', 10), ('Software Engineering', 11), ('Startup Building', 12),
  ('Leadership', 13), ('Career Development', 14), ('Product Design', 15),
  ('Experimentation', 16);

create table public.user_topics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  topic_id    uuid not null references public.topics (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, topic_id)
);

alter table public.user_topics enable row level security;
create policy "user_topics: self read" on public.user_topics for select using (auth.uid() = user_id);
create policy "user_topics: self insert" on public.user_topics for insert with check (auth.uid() = user_id);
create policy "user_topics: self delete" on public.user_topics for delete using (auth.uid() = user_id);

-- Backfill: existing areas_of_interest values that case-insensitively
-- match a new Topic name carry straight over, so a user who already
-- selected e.g. "Growth" doesn't lose that signal. Values with no match
-- (mostly industry verticals — Fintech, B2B SaaS, HealthTech, etc.) are
-- left in areas_of_interest only; nothing forces them into this table.
insert into public.user_topics (user_id, topic_id)
select u.id, t.id
from public.users u
cross join lateral unnest(u.areas_of_interest) as area(name)
join public.topics t on lower(t.name) = lower(area.name)
on conflict (user_id, topic_id) do nothing;


-- ----------------------------------------------------------
-- onboarding_progress — per-user step completion state (Epic A.4)
-- One row per user, one timestamp column per step. Null = not done yet;
-- whichever is the first null column (in order) is where they resume.
-- ----------------------------------------------------------
create table public.onboarding_progress (
  user_id                 uuid primary key references public.users (id) on delete cascade,
  account_completed_at    timestamptz,
  about_you_completed_at  timestamptz,
  role_completed_at       timestamptz,
  experience_completed_at timestamptz,
  goals_completed_at      timestamptz,
  topics_completed_at     timestamptz,
  completed_at            timestamptz,
  updated_at              timestamptz not null default now()
);

alter table public.onboarding_progress enable row level security;
create policy "onboarding_progress: self read" on public.onboarding_progress for select using (auth.uid() = user_id);
create policy "onboarding_progress: self insert" on public.onboarding_progress for insert with check (auth.uid() = user_id);
create policy "onboarding_progress: self update" on public.onboarding_progress for update using (auth.uid() = user_id);

-- Existing users already completed the old single-step onboarding — treat
-- them as fully grandfathered rather than forcing a redo of the new flow.
-- New signups get no row here until they actually start (first upsert on
-- account creation), which is what "resume where you left off" reads as
-- "no row yet" for.
insert into public.onboarding_progress (user_id, account_completed_at, about_you_completed_at, role_completed_at, experience_completed_at, goals_completed_at, topics_completed_at, completed_at)
select id, created_at, created_at, created_at, created_at, created_at, created_at, created_at
from public.users
where onboarding_done = true
on conflict (user_id) do nothing;


-- ----------------------------------------------------------
-- notification_preferences — schema skeleton only (Epic A explicitly
-- defers full build to a later epic). One row per user per preference key.
-- ----------------------------------------------------------
create table public.notification_preferences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  key         text not null,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id, key)
);

alter table public.notification_preferences enable row level security;
create policy "notification_preferences: self read" on public.notification_preferences for select using (auth.uid() = user_id);
create policy "notification_preferences: self insert" on public.notification_preferences for insert with check (auth.uid() = user_id);
create policy "notification_preferences: self update" on public.notification_preferences for update using (auth.uid() = user_id);
create policy "notification_preferences: self delete" on public.notification_preferences for delete using (auth.uid() = user_id);


-- ----------------------------------------------------------
-- analytics_events — packages/analytics' typed track() target (Step 3 of
-- the earlier migration brief, actually built now that Epic A needs it).
-- Deliberately NOT the same table as content_interactions: that table's
-- content_id is NOT NULL (it only ever tracks content-scoped actions —
-- view/share/download/etc.), while most of these events (signup_started,
-- onboarding_step_completed, search_performed, ...) have no content at
-- all. Additive — content_interactions keeps doing exactly what it does.
-- ----------------------------------------------------------
create table public.analytics_events (
  id            uuid primary key default gen_random_uuid(),
  event_name    text not null,
  user_id       uuid references public.users (id) on delete set null,
  anonymous_id  text,
  content_id    uuid references public.content (id) on delete set null,
  content_type  text,
  session_id    text,
  source        text,
  device        text,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index analytics_events_event_name_idx on public.analytics_events (event_name);
create index analytics_events_user_id_idx on public.analytics_events (user_id);

alter table public.analytics_events enable row level security;
-- Open insert, including anonymous (unauthenticated) callers — several of
-- these events (signup_started, search_performed pre-login) fire before a
-- user exists at all, which is exactly what anonymous_id is for. This is a
-- write-only firehose from the client's perspective, same trust model as
-- any client-side analytics SDK (PostHog, etc.) — reads are admin-only,
-- this is a reporting table, not something users query back.
create policy "analytics_events: anyone insert"
  on public.analytics_events for insert
  with check (true);

create policy "analytics_events: admin read"
  on public.analytics_events for select
  using (exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'super_admin')));
