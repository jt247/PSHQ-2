-- ----------------------------------------------------------
-- Epic F: Community & Engagement — scoring, leaderboard, achievements
--
-- Confirmed during discovery: achievements/contribution/leaderboard tables
-- assumed to exist from Build Prompt 1 were never built (same pattern as
-- every prior epic). Comment/rating UI DOES already exist (articles only,
-- Build Prompt 3) — reused, not rebuilt, extended with spam/duplicate
-- guards here.
--
-- Design for "category leaderboards later without a schema rework"
-- (§F.4): contribution_events.action is the source of truth. Weekly/
-- monthly views and any future category view (Top Learner, Top
-- Contributor, Top Builder) are just different WHERE/GROUP BY queries
-- over this one table — leaderboard_scores is only a cheap all-time
-- rollup cache, never the source of truth, so no future migration is
-- needed to add a category, only a new query.
-- ----------------------------------------------------------

create type public.contribution_action as enum (
  'content_completed', 'favorite', 'rating', 'thoughtful_comment',
  'module_completed', 'path_completed', 'case_accepted',
  'product_lab_attendance', 'community_contribution_approved',
  'streak_bonus', 'admin_adjustment'
);

-- Fixed, not a lookup table — the whole point of an enum-keyed CASE is
-- that scoring values can't drift between the DB function and app code
-- reading two different sources. JT can ask for a rebalance later; it's
-- one function body to edit, not a data migration.
create or replace function public.contribution_points(p_action public.contribution_action)
returns integer
language sql
immutable
as $$
  select case p_action
    when 'content_completed' then 2
    when 'favorite' then 1
    when 'rating' then 1
    when 'thoughtful_comment' then 4
    when 'module_completed' then 3
    when 'path_completed' then 15
    when 'case_accepted' then 20
    when 'product_lab_attendance' then 10
    when 'community_contribution_approved' then 5
    when 'streak_bonus' then 5
    else 0
  end;
$$;

-- Daily caps per action (JT: adjust these, they're a starting guess, not
-- a locked-in balance decision). Admin-granted actions (case_accepted,
-- product_lab_attendance, community_contribution_approved,
-- admin_adjustment) are uncapped here — they're already rate-limited by
-- requiring an admin to grant them one at a time.
create or replace function public.contribution_daily_cap(p_action public.contribution_action)
returns integer
language sql
immutable
as $$
  select case p_action
    when 'content_completed' then 5
    when 'favorite' then 10
    when 'rating' then 10
    when 'thoughtful_comment' then 5
    when 'module_completed' then 10
    when 'path_completed' then 3
    else null -- null = uncapped
  end;
$$;

create table public.contribution_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  action      public.contribution_action not null,
  points      integer not null,
  -- Soft reference, deliberately no FK: the source varies across content,
  -- case_library_entries, learning_paths, learning_path_modules — one
  -- column covers all of them for display/audit purposes without needing
  -- a different nullable FK column per source table.
  ref_id      uuid,
  -- Dedup key, scoped per (user_id, action): "no repeated action farming"
  -- (§F.3) is enforced by a real unique constraint, not app-layer
  -- discipline. content_completed/favorite/rating key off ref_id (score
  -- once ever per item); thoughtful_comment keys off a normalized-text
  -- hash (score once per distinct comment, not per content item);
  -- streak_bonus keys off the ISO year-week (score once per week).
  dedupe_key  text,
  granted_by  uuid references public.users (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now(),
  unique (user_id, action, dedupe_key)
);

create index on public.contribution_events (user_id, created_at);
create index on public.contribution_events (user_id, action, created_at);

alter table public.contribution_events enable row level security;
create policy "contribution_events: self read" on public.contribution_events for select using (auth.uid() = user_id);
create policy "contribution_events: admin read" on public.contribution_events for select using (public.is_admin());
-- No direct insert policy for any role — every insert goes through the
-- SECURITY DEFINER functions below, which is exactly what makes "no
-- self-generated admin points" (§F.3) true: there is no code path, RLS
-- or otherwise, that lets a client insert a row here directly.

create table public.leaderboard_scores (
  user_id       uuid primary key references public.users (id) on delete cascade,
  total_score   integer not null default 0,
  updated_at    timestamptz not null default now()
);

alter table public.leaderboard_scores enable row level security;
create policy "leaderboard_scores: public read" on public.leaderboard_scores for select using (true);
-- Read is intentionally open (rank needs to be computable for the public
-- leaderboard) — no insert/update policy for any role, only the
-- SECURITY DEFINER functions below ever write to it.


-- ----------------------------------------------------------
-- award_contribution_event() — the ONLY way a contribution_events row
-- gets written for a self-generated action. auth.uid()-scoped (no
-- target-user parameter), so a client can never award points to anyone
-- but themselves, and never anything but the fixed point value for a
-- given action. Returns true if it actually scored (false if capped or
-- deduped) so callers can decide whether to fire analytics.
-- ----------------------------------------------------------
create or replace function public.award_contribution_event(
  p_action public.contribution_action,
  p_ref_id uuid,
  p_dedupe_key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cap integer;
  today_count integer;
  pts integer;
begin
  if uid is null then
    return false;
  end if;

  -- Admin-only actions can never be self-awarded through this function.
  if p_action in ('case_accepted', 'product_lab_attendance', 'community_contribution_approved', 'admin_adjustment') then
    return false;
  end if;

  cap := public.contribution_daily_cap(p_action);
  if cap is not null then
    select count(*) into today_count
    from public.contribution_events
    where user_id = uid and action = p_action and created_at >= date_trunc('day', now());
    if today_count >= cap then
      return false;
    end if;
  end if;

  pts := public.contribution_points(p_action);

  insert into public.contribution_events (user_id, action, points, ref_id, dedupe_key)
  values (uid, p_action, pts, p_ref_id, p_dedupe_key)
  on conflict (user_id, action, dedupe_key) do nothing;

  if not found then
    return false;
  end if;

  insert into public.leaderboard_scores (user_id, total_score, updated_at)
  values (uid, pts, now())
  on conflict (user_id) do update set total_score = public.leaderboard_scores.total_score + pts, updated_at = now();

  perform public.check_and_award_achievements();

  return true;
end;
$$;

grant execute on function public.award_contribution_event(public.contribution_action, uuid, text) to authenticated;


-- ----------------------------------------------------------
-- Streak bonus — separate from award_contribution_event since it isn't
-- triggered by a single discrete action; called from the dashboard page
-- load (cheap, idempotent via the weekly dedupe key).
-- ----------------------------------------------------------
create or replace function public.check_and_award_streak_bonus()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  streak integer;
  week_key text;
  pts integer;
begin
  if uid is null then return false; end if;
  streak := public.get_my_streak();
  if streak < 7 then return false; end if;

  week_key := to_char(current_date, 'IYYY-IW');
  pts := public.contribution_points('streak_bonus');

  insert into public.contribution_events (user_id, action, points, dedupe_key)
  values (uid, 'streak_bonus', pts, week_key)
  on conflict (user_id, action, dedupe_key) do nothing;

  if not found then return false; end if;

  insert into public.leaderboard_scores (user_id, total_score, updated_at)
  values (uid, pts, now())
  on conflict (user_id) do update set total_score = public.leaderboard_scores.total_score + pts, updated_at = now();

  return true;
end;
$$;

grant execute on function public.check_and_award_streak_bonus() to authenticated;


-- ----------------------------------------------------------
-- Admin-mediated scoring (§F.2's three actions with no self-serve UI yet:
-- case_accepted, product_lab_attendance, community_contribution_approved)
-- plus a raw manual correction. Both admin-gated inside the function
-- (not just by RLS), both are the "simple internal route" pattern —
-- apps/admin gets one small form calling these, no queue/review UI
-- (that's Epic G).
-- ----------------------------------------------------------
create or replace function public.admin_grant_contribution(
  p_target_user_id uuid,
  p_action public.contribution_action,
  p_ref_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  pts integer;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  if p_action not in ('case_accepted', 'product_lab_attendance', 'community_contribution_approved') then
    raise exception 'admin_grant_contribution only grants case_accepted, product_lab_attendance, or community_contribution_approved';
  end if;

  pts := public.contribution_points(p_action);

  insert into public.contribution_events (user_id, action, points, ref_id, granted_by)
  values (p_target_user_id, p_action, pts, p_ref_id, auth.uid());

  insert into public.leaderboard_scores (user_id, total_score, updated_at)
  values (p_target_user_id, pts, now())
  on conflict (user_id) do update set total_score = public.leaderboard_scores.total_score + pts, updated_at = now();

  return true;
end;
$$;

grant execute on function public.admin_grant_contribution(uuid, public.contribution_action, uuid) to authenticated;

create or replace function public.admin_adjust_score(
  p_target_user_id uuid,
  p_delta integer,
  p_note text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  insert into public.contribution_events (user_id, action, points, granted_by, note)
  values (p_target_user_id, 'admin_adjustment', p_delta, auth.uid(), p_note);

  insert into public.leaderboard_scores (user_id, total_score, updated_at)
  values (p_target_user_id, p_delta, now())
  on conflict (user_id) do update set total_score = public.leaderboard_scores.total_score + p_delta, updated_at = now();

  return true;
end;
$$;

grant execute on function public.admin_adjust_score(uuid, integer, text) to authenticated;


-- ----------------------------------------------------------
-- get_my_community_position() — REPLACED, not just extended. The Epic D
-- version computed an ad-hoc weighted score (comments/upvotes/shares) as
-- a stand-in for the real model that didn't exist yet. Now that it does,
-- this reads from leaderboard_scores (the real §F.2 model) instead —
-- same function name and return shape, so the Epic D dashboard component
-- that already calls it needs zero changes.
-- ----------------------------------------------------------
create or replace function public.get_my_community_position()
returns table (rank bigint, score bigint, total_ranked bigint)
language sql
security definer
set search_path = public
stable
as $$
  with ranked as (
    select user_id, total_score, rank() over (order by total_score desc) as rnk, count(*) over () as total
    from public.leaderboard_scores
    where total_score > 0
  )
  select rnk, total_score, total from ranked where user_id = auth.uid();
$$;


-- ----------------------------------------------------------
-- get_leaderboard() — /leaderboard, all three time views. Privacy
-- masking lives here (the one sanctioned path to read another member's
-- row for this purpose), same pattern as get_public_profile(): private
-- members still rank (their real activity still counts), but display
-- name falls back to their username or "Member" — never full_name or
-- email — for anyone whose privacy_tier is 'private'.
-- ----------------------------------------------------------
create or replace function public.get_leaderboard(p_period text default 'all_time', p_limit integer default 50)
returns table (
  rank bigint, user_id uuid, display_name text, avatar_url text, score bigint, is_self boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  since timestamptz;
begin
  if p_period = 'weekly' then
    since := date_trunc('week', now());
  elsif p_period = 'monthly' then
    since := date_trunc('month', now());
  else
    since := '-infinity'::timestamptz;
  end if;

  return query
  with scores as (
    select ce.user_id, sum(ce.points)::bigint as period_score
    from public.contribution_events ce
    where ce.created_at >= since
    group by ce.user_id
    having sum(ce.points) > 0
  ),
  ranked as (
    select s.user_id, s.period_score, rank() over (order by s.period_score desc) as rnk
    from scores s
  )
  select
    r.rnk,
    r.user_id,
    case when u.privacy_tier = 'private' then coalesce(u.username, 'Member') else coalesce(u.full_name, u.username, 'Member') end,
    case when u.privacy_tier = 'private' then null else u.avatar_url end,
    r.period_score,
    r.user_id = auth.uid()
  from ranked r
  join public.users u on u.id = r.user_id
  order by r.rnk
  limit p_limit;
end;
$$;

grant execute on function public.get_leaderboard(text, integer) to authenticated;


-- ----------------------------------------------------------
-- Achievements (§F.4) — 5 launch achievements, fixed reference table +
-- a per-user earned table, exactly the AchievementRow/UserAchievement
-- shape the build prompt describes.
-- ----------------------------------------------------------
create table public.achievements (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,
  title         text not null,
  description   text not null,
  icon          text not null,
  sort_order    integer not null default 0
);

alter table public.achievements enable row level security;
create policy "achievements: public read" on public.achievements for select using (true);

insert into public.achievements (key, title, description, icon, sort_order) values
  ('first_slice', 'First Slice', 'Complete your first learning resource', '🍕', 1),
  ('product_explorer', 'Product Explorer', 'Complete 10 learning resources', '🧭', 2),
  ('path_builder', 'Path Builder', 'Complete your first learning path', '🛤️', 3),
  ('product_operator', 'Product Operator', 'Complete 5 practical templates or resources', '🛠️', 4),
  ('deep_learner', 'Deep Learner', 'Complete learning activity on 10 separate days', '📚', 5);

create table public.user_achievements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  achievement_id  uuid not null references public.achievements (id) on delete cascade,
  earned_at       timestamptz not null default now(),
  unique (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;
create policy "user_achievements: self read" on public.user_achievements for select using (auth.uid() = user_id);
create policy "user_achievements: public read for leaderboard/profile display" on public.user_achievements for select using (true);
create index on public.user_achievements (user_id);

-- No insert policy for any role — only check_and_award_achievements()
-- (SECURITY DEFINER) ever writes here, same "no self-serve write path"
-- pattern as contribution_events.

create or replace function public.check_and_award_achievements()
returns setof text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  completed_count integer;
  template_completed_count integer;
  path_completed_count integer;
  distinct_days integer;
  achievement_row record;
  newly_earned text;
begin
  if uid is null then return; end if;

  -- "learning resource" spans both content_progress (articles/ebooks/
  -- templates/guides/build notes) and case_progress (case studies are a
  -- real, separate table, not a content row — see Epic D's discovery of
  -- the same split) — First Slice / Product Explorer count both.
  select
    (select count(*) from public.content_progress where user_id = uid and status = 'completed')
    + (select count(*) from public.case_progress where user_id = uid and status = 'completed')
  into completed_count;
  select count(*) into template_completed_count
    from public.content_progress cp join public.content c on c.id = cp.content_id
    where cp.user_id = uid and cp.status = 'completed' and c.type = 'template';
  select count(*) into path_completed_count from public.user_learning_paths where user_id = uid and completed_at is not null;
  select count(distinct d) into distinct_days from (
    select (completed_at at time zone 'utc')::date as d from public.content_progress where user_id = uid and status = 'completed' and completed_at is not null
    union
    select (completed_at at time zone 'utc')::date from public.module_progress where user_id = uid and status = 'completed' and completed_at is not null
    union
    select (completed_at at time zone 'utc')::date from public.case_progress where user_id = uid and status = 'completed' and completed_at is not null
  ) days;

  for achievement_row in
    select id, key from public.achievements
    where key = any(array[
      case when completed_count >= 1 then 'first_slice' end,
      case when completed_count >= 10 then 'product_explorer' end,
      case when path_completed_count >= 1 then 'path_builder' end,
      case when template_completed_count >= 5 then 'product_operator' end,
      case when distinct_days >= 10 then 'deep_learner' end
    ])
  loop
    insert into public.user_achievements (user_id, achievement_id)
    values (uid, achievement_row.id)
    on conflict (user_id, achievement_id) do nothing;
    if found then
      newly_earned := achievement_row.key;
      return next newly_earned;
    end if;
  end loop;

  return;
end;
$$;

grant execute on function public.check_and_award_achievements() to authenticated;


-- ----------------------------------------------------------
-- get_public_profile() — REPLACED, same reason as get_my_community_
-- position() above: the Epic D version computed contribution_score with
-- an ad-hoc weighted formula as a stand-in for the real model. Now reads
-- leaderboard_scores (the real §F.2 rollup) instead. Same signature, same
-- column order, so /profile/[username] (web) and the mobile equivalent
-- need zero changes — only adds earned achievement keys as a new trailing
-- column, additive.
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
  created_at timestamptz,
  achievement_keys text[]
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
    coalesce((select ls.total_score from public.leaderboard_scores ls where ls.user_id = target.id), 0),
    target.created_at,
    (select coalesce(array_agg(a.key order by ua.earned_at), '{}') from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id where ua.user_id = target.id);
end;
$$;

grant execute on function public.get_public_profile(text) to authenticated, anon;
