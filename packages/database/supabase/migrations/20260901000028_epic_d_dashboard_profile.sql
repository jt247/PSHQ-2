-- ----------------------------------------------------------
-- Epic D: My ProductSlice — schema additions
--
-- Everything else D.4 needs (headline, company, region, links, skills,
-- topics, goals, privacy_tier, learning paths, content_progress) already
-- exists from Epic A/B. The one real gap is `username` for /profile/
-- [username] — nothing in the schema has ever stored one.
-- ----------------------------------------------------------

alter table public.users
  add column if not exists username text;

-- Case-insensitive uniqueness (so "JT" and "jt" can't both be claimed) via
-- a unique index rather than a plain column constraint. Partial (where not
-- null) so every existing user without a username yet doesn't collide on
-- the same NULL — NULLs already don't conflict under a plain unique index
-- in Postgres, but being explicit here documents the intent.
create unique index users_username_lower_idx
  on public.users (lower(username))
  where username is not null;

comment on column public.users.username is 'Public handle for /profile/[username]. Nullable until the member sets one in Settings — no auto-generation, no forced claim. Editable any time, not locked after first set (JT decision, 2026-09-01).';

-- No RLS change needed: "users: self update" (migration 001) already
-- allows a user to update any of their own non-role columns, username
-- included. Uniqueness violations surface as a normal insert/update error
-- for the settings form to catch.


-- ----------------------------------------------------------
-- get_my_community_position() — Epic D Community Position section.
--
-- Migration 020 locked `users` down to self-read/admin-read, so the old
-- getTopCommunityMembers() app-side function (comments+upvotes+shares+
-- downloads+ai-summaries, service-role read of every user) is the only
-- thing that ever computed this. Rebuilt here as a SECURITY DEFINER SQL
-- function instead of app code for one reason: it's the one piece of
-- Epic D that both web (Next.js, service-role available) and mobile
-- (anon-key only, no service role, must never see one) both need — a
-- database function is the one shared source of truth an anon-key client
-- can call safely, returning ONLY the calling user's own rank/score, never
-- another user's row. Empty result = not yet ranked (real empty state,
-- not a fabricated "you're #1").
-- ----------------------------------------------------------
create or replace function public.get_my_community_position()
returns table (rank bigint, score bigint, total_ranked bigint)
language sql
security definer
set search_path = public
stable
as $$
  with scores as (
    select user_id, sum(pts)::bigint as score
    from (
      select user_id, 3 as pts from public.content_comments where user_id is not null
      union all
      select user_id, 1 as pts from public.content_upvotes where user_id is not null
      union all
      select user_id,
        case type when 'share' then 2 when 'ai_summary_requested' then 1 when 'download' then 1 else 0 end as pts
        from public.content_interactions
        where type in ('share', 'ai_summary_requested', 'download') and user_id is not null
    ) all_points
    group by user_id
  ),
  ranked as (
    select user_id, score, rank() over (order by score desc) as rnk, count(*) over () as total
    from scores
  )
  select rnk, score, total from ranked where user_id = auth.uid();
$$;

grant execute on function public.get_my_community_position() to authenticated;


-- ----------------------------------------------------------
-- get_my_streak() — consecutive-day activity streak, computed live from
-- existing interaction/progress/exercise timestamps. No new table: a
-- streaks table would need a write on every qualifying action just to
-- cache a number this function derives in a few small index scans, for a
-- v1 feature with unproven read volume. Revisit only if this measurably
-- shows up as slow.
--
-- Today counts as "still on your streak" even with zero activity yet
-- (checked first, allowed to be empty) so the number doesn't drop to 0
-- for someone reading the dashboard before they've done anything today.
-- ----------------------------------------------------------
create or replace function public.get_my_streak()
returns integer
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  streak integer := 0;
  check_date date := current_date;
  has_activity boolean;
  uid uuid := auth.uid();
begin
  if uid is null then
    return 0;
  end if;

  loop
    select exists (
      select 1 from public.content_interactions
        where user_id = uid and type in ('view', 'download', 'read', 'listen') and created_at::date = check_date
      union all
      select 1 from public.content_progress
        where user_id = uid and completed_at::date = check_date
      union all
      select 1 from public.exercise_responses
        where user_id = uid and created_at::date = check_date
    ) into has_activity;

    if not has_activity then
      if check_date = current_date then
        check_date := check_date - 1;
        continue;
      end if;
      exit;
    end if;

    streak := streak + 1;
    check_date := check_date - 1;
  end loop;

  return streak;
end;
$$;

grant execute on function public.get_my_streak() to authenticated;


-- ----------------------------------------------------------
-- get_public_profile(username) — /profile/[username], enforcing the D.5
-- three-tier privacy rule inside the function (definer bypasses the
-- self-read-only RLS on `users`, so this is the ONLY sanctioned way to
-- read another member's row). Never selects email — not in the return
-- signature at all, so there's no accidental leak path. Location stops at
-- country/region because that's all the schema stores; nothing more
-- granular exists to over-return.
--
-- private             -> only the owner gets a row back, everyone else: empty
-- community ("Members only") -> any signed-in user (auth.uid() not null)
-- public              -> anyone, including signed-out (anon key)
-- ----------------------------------------------------------
create or replace function public.get_public_profile(p_username text)
returns table (
  id uuid, username text, full_name text, avatar_url text, headline text,
  job_role text, company text, country text, region text,
  experience_level public.experience_level, years_experience integer,
  bio text, skills text[], linkedin_url text, portfolio_url text,
  website_url text, github_url text, x_url text, privacy_tier public.privacy_tier,
  topic_names text[], goal_names text[],
  completed_paths_count bigint, completed_resources_count bigint, contribution_score bigint,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  target public.users%rowtype;
begin
  select * into target from public.users u where lower(u.username) = lower(p_username);
  if target.id is null then
    return;
  end if;

  if target.privacy_tier = 'private' and target.id is distinct from auth.uid() then
    return;
  end if;

  if target.privacy_tier = 'community' and auth.uid() is null then
    return;
  end if;

  return query
  select
    target.id, target.username, target.full_name, target.avatar_url, target.headline,
    target.job_role, target.company, target.country, target.region,
    target.experience_level, target.years_experience, target.bio, target.skills,
    target.linkedin_url, target.portfolio_url, target.website_url, target.github_url, target.x_url,
    target.privacy_tier,
    (select coalesce(array_agg(t.name), '{}') from public.user_topics ut join public.topics t on t.id = ut.topic_id where ut.user_id = target.id),
    (select coalesce(array_agg(g.name), '{}') from public.user_goals ug join public.goals g on g.id = ug.goal_id where ug.user_id = target.id),
    (select count(*) from public.user_learning_paths where user_id = target.id and completed_at is not null),
    (select count(*) from public.content_progress where user_id = target.id and status = 'completed'),
    (select coalesce(sum(pts), 0) from (
      select 3 as pts from public.content_comments where user_id = target.id
      union all
      select 1 as pts from public.content_upvotes where user_id = target.id
      union all
      select case type when 'share' then 2 when 'ai_summary_requested' then 1 when 'download' then 1 else 0 end as pts
        from public.content_interactions where user_id = target.id and type in ('share', 'ai_summary_requested', 'download')
    ) all_points),
    target.created_at;
end;
$$;

grant execute on function public.get_public_profile(text) to authenticated, anon;


-- ----------------------------------------------------------
-- case_favorites / case_progress — real gap found during Epic D discovery.
-- `case_library_entries` (Epic B) is a genuinely separate table from
-- `content`, not a content type row, so content_favorites/content_progress
-- (both FK'd to content.id) cannot track a case study at all. Step 5 asks
-- for case completion and Step 2's Saved section asks for "saved case
-- studies" — neither was possible before this. Same shape and RLS as
-- content_favorites/content_progress, just pointed at case_library_entries.
-- ----------------------------------------------------------
create table public.case_favorites (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.case_library_entries (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (case_id, user_id)
);

alter table public.case_favorites enable row level security;
create policy "case_favorites: self read" on public.case_favorites for select using (auth.uid() = user_id);
create policy "case_favorites: self insert" on public.case_favorites for insert with check (auth.uid() = user_id);
create policy "case_favorites: self delete" on public.case_favorites for delete using (auth.uid() = user_id);
create index on public.case_favorites (user_id);

-- last_viewed_at exists here because cases have no working "opened" signal
-- at all: trackContentOpened(caseId) elsewhere in the app writes to
-- analytics_events.content_id, which is FK'd to content.id — case_library_
-- entries rows aren't content rows, so every one of those inserts fails
-- its foreign key check and is silently swallowed by packages/analytics'
-- catch-all (pre-existing bug, logged in SIDENOTES.md, not fixed here —
-- fixing the FK is a cross-epic schema change, out of scope for Epic D).
-- Touching last_viewed_at on every case page view gives Continue Learning
-- and Recently Viewed a real signal for cases without touching that bug.
create table public.case_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  case_id       uuid not null references public.case_library_entries (id) on delete cascade,
  status        public.progress_status not null default 'not_started',
  completed_at  timestamptz,
  last_viewed_at timestamptz,
  updated_at    timestamptz not null default now(),
  unique (user_id, case_id)
);

alter table public.case_progress enable row level security;
create policy "case_progress: self read" on public.case_progress for select using (auth.uid() = user_id);
create policy "case_progress: self insert" on public.case_progress for insert with check (auth.uid() = user_id);
create policy "case_progress: self update" on public.case_progress for update using (auth.uid() = user_id);
create index on public.case_progress (user_id);
