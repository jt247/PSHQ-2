-- ----------------------------------------------------------
-- Epic G: Admin & Operations — schema
--
-- Additive only, per standing rule 1. No existing table is re-migrated or
-- re-shaped: content_topics/goals/roles, learning_path_modules, collections,
-- case_library_entries, series, exercises all already exist from Epic B and
-- get admin UI on top of them in this epic, not new tables.
-- ----------------------------------------------------------

-- ============================================================
-- USER SUSPENSION (Step 3 — replaces "no suspend mechanism at all")
-- ============================================================

alter table public.users
  add column if not exists suspended_at     timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists suspended_by     uuid references public.users (id) on delete set null;

comment on column public.users.suspended_at is 'Set by suspend_user(), cleared by restore_user(). Non-null = account suspended.';

-- SECURITY DEFINER so the check can't be bypassed by an RLS gap and so the
-- action is always the one place that writes these columns.
create or replace function public.suspend_user(p_target_user_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  if p_target_user_id = auth.uid() then
    raise exception 'Cannot suspend your own account';
  end if;

  update public.users
  set suspended_at = now(), suspended_reason = p_reason, suspended_by = auth.uid()
  where id = p_target_user_id;

  return true;
end;
$$;

create or replace function public.restore_user(p_target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  update public.users
  set suspended_at = null, suspended_reason = null, suspended_by = null
  where id = p_target_user_id;

  return true;
end;
$$;

grant execute on function public.suspend_user(uuid, text) to authenticated;
grant execute on function public.restore_user(uuid) to authenticated;


-- ============================================================
-- FIX: admin_grant_contribution had no real dedupe key (Epic F bug found
-- while wiring comment-approval scoring in this epic) — NULL dedupe_key
-- is distinct from every other NULL in the unique constraint, so an admin
-- re-approving the same comment/case would score it twice. Same function
-- signature is NOT changed (p_dedupe_key is a new 4th param with a
-- default), so every existing caller keeps working unmodified.
-- ============================================================

create or replace function public.admin_grant_contribution(
  p_target_user_id uuid,
  p_action public.contribution_action,
  p_ref_id uuid default null,
  p_dedupe_key text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  pts integer;
  dedupe text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  if p_action not in ('case_accepted', 'product_lab_attendance', 'community_contribution_approved') then
    raise exception 'admin_grant_contribution only grants case_accepted, product_lab_attendance, or community_contribution_approved';
  end if;

  pts := public.contribution_points(p_action);
  dedupe := coalesce(p_dedupe_key, p_ref_id::text);

  insert into public.contribution_events (user_id, action, points, ref_id, granted_by, dedupe_key)
  values (p_target_user_id, p_action, pts, p_ref_id, auth.uid(), dedupe)
  on conflict (user_id, action, dedupe_key) do nothing;

  if not found then
    return false;
  end if;

  insert into public.leaderboard_scores (user_id, total_score, updated_at)
  values (p_target_user_id, pts, now())
  on conflict (user_id) do update set total_score = public.leaderboard_scores.total_score + pts, updated_at = now();

  return true;
end;
$$;

grant execute on function public.admin_grant_contribution(uuid, public.contribution_action, uuid, text) to authenticated;


-- ============================================================
-- COMMENT MODERATION (Step 11 — replaces "no moderation at all")
-- ============================================================

alter table public.content_comments
  add column if not exists is_hidden      boolean not null default false,
  add column if not exists is_flagged     boolean not null default false,
  add column if not exists flagged_reason text,
  add column if not exists is_approved    boolean not null default false,
  add column if not exists moderated_by   uuid references public.users (id) on delete set null,
  add column if not exists moderated_at   timestamptz;

comment on column public.content_comments.is_hidden is 'Admin moderation hide — distinct from is_deleted (the author''s own delete).';
comment on column public.content_comments.is_flagged is 'Set by a light heuristic at post time (link spam, near-duplicate across users) or manually by an admin.';
comment on column public.content_comments.is_approved is 'Feeds community_contribution_approved scoring via admin_grant_contribution — set only through the moderation UI, never directly.';

-- Public-facing comment reads must never show hidden comments. Replaces
-- the original "comments: public read" policy (migration 000001) with the
-- same published-content check plus the new is_hidden gate — the old
-- policy had no is_hidden concept to gate on at all.
drop policy if exists "comments: public read" on public.content_comments;
create policy "comments: public read" on public.content_comments
  for select using (
    is_hidden = false
    and exists (
      select 1 from public.content c
      where c.id = content_id and c.status = 'published'
    )
  );

create or replace function public.moderate_comment(p_comment_id uuid, p_hide boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  update public.content_comments
  set is_hidden = p_hide, moderated_by = auth.uid(), moderated_at = now()
  where id = p_comment_id;

  return true;
end;
$$;

grant execute on function public.moderate_comment(uuid, boolean) to authenticated;


-- ============================================================
-- UNIFIED FEEDBACK (Step 10 — "Give Feedback" entry point, genuinely new)
-- ============================================================

create type public.feedback_category as enum (
  'bug', 'feature_suggestion', 'content_request', 'something_confusing',
  'something_liked', 'account_support', 'other'
);

-- Shared 6-value workflow. support_tickets and content_requests keep their
-- own native enums (standing rule 1 — not re-migrating live data); the
-- admin Support & Feedback Center maps those to this vocabulary for
-- display only. feedback rows use this enum natively since the table is
-- new.
create type public.feedback_status as enum (
  'new', 'reviewing', 'planned', 'in_progress', 'resolved', 'closed'
);

create table public.feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.users (id) on delete set null,
  category      public.feedback_category not null,
  message       text not null,
  status        public.feedback_status not null default 'new',
  url           text,
  device        text,
  browser       text,
  is_logged_in  boolean not null default false,
  screenshot_url text,
  admin_notes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index on public.feedback (status, created_at desc);
create index on public.feedback (category);
create index on public.feedback (user_id);

alter table public.feedback enable row level security;

-- Anyone (including anonymous, for logged-out feedback) may submit.
create policy "feedback: anyone insert" on public.feedback for insert with check (true);
-- A signed-in member can see their own submissions; admin reads via service client.
create policy "feedback: self read" on public.feedback for select using (auth.uid() = user_id);
-- Admin status changes (Support & Feedback Center) go through the admin's own
-- RLS-bound client, same pattern as "requests: admin full access" and
-- "comments: admin full access" — not the service client, so is_admin() is
-- checked for real rather than assumed from which client was used.
create policy "feedback: admin full access" on public.feedback for all using (public.is_admin()) with check (public.is_admin());

create trigger feedback_updated_at
  before update on public.feedback
  for each row execute function public.touch_updated_at();
