-- ----------------------------------------------------------
-- Epic J: Growth, Beta Rollout & Launch Plan — cohort tooling and the
-- Weekly ProductSlice Digest.
--
-- Additive only, per standing rule 1. Reuses users/content/topics/
-- notifications/analytics_events as-is — no parallel taxonomy, per §113
-- (same principle Epic B already followed for content_topics).
--
-- Per Standing Rule 2: NOTHING in this migration seeds cohort_memberships
-- or cohort_invites with any user data. Both tables start empty. JT
-- assigns real members via the admin UI this migration supports.
-- ----------------------------------------------------------

-- ============================================================
-- COHORT TOOLING (§J.1-J.4) — one tagging mechanism, reused by
-- Cohort Zero/A/B/C rather than three separate builds.
-- ============================================================

create type public.cohort_name as enum ('zero', 'a', 'b', 'c');

-- One row per (user, cohort) — a user can be in Cohort Zero (the general
-- workshop pool) AND later get flagged into Cohort A/B/C without losing
-- the earlier tag, matching how the PRD describes them as overlapping
-- rollout waves, not mutually exclusive buckets.
create table public.cohort_memberships (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  cohort       public.cohort_name not null,
  assigned_at  timestamptz not null default now(),
  assigned_by  uuid references public.users (id) on delete set null,
  unique (user_id, cohort)
);

create index cohort_memberships_user_id_idx on public.cohort_memberships (user_id);
create index cohort_memberships_cohort_idx on public.cohort_memberships (cohort);

alter table public.cohort_memberships enable row level security;
create policy "cohort_memberships: admin all" on public.cohort_memberships for all using (public.is_admin()) with check (public.is_admin());
create policy "cohort_memberships: self read" on public.cohort_memberships for select using (auth.uid() = user_id);

-- Cohort Zero is ~200 people from JT's existing workshop database — most
-- of whom are not yet ProductSlice HQ accounts. This lets admin tag a
-- real email address for a cohort *before* that person signs up; the
-- auth callback checks this table on every signup and auto-converts a
-- matching invite into a real cohort_memberships row the moment the
-- account exists. No fabricated rows are ever inserted here by Claude
-- Code — this table starts and stays empty until JT supplies real emails
-- through the admin UI.
create table public.cohort_invites (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  cohort       public.cohort_name not null,
  invited_by   uuid references public.users (id) on delete set null,
  invited_at   timestamptz not null default now(),
  consumed_at  timestamptz,
  unique (email, cohort)
);

create index cohort_invites_email_idx on public.cohort_invites (lower(email));

alter table public.cohort_invites enable row level security;
create policy "cohort_invites: admin all" on public.cohort_invites for all using (public.is_admin()) with check (public.is_admin());

-- SECURITY DEFINER so the signup callback (running as the new user, not
-- an admin) can still read/consume its own matching invite rows despite
-- the admin-only RLS above.
create or replace function public.consume_cohort_invites(p_user_id uuid, p_email text)
returns setof public.cohort_name
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
begin
  for inv in
    select id, cohort from public.cohort_invites
    where lower(email) = lower(p_email) and consumed_at is null
  loop
    insert into public.cohort_memberships (user_id, cohort, assigned_by)
    values (p_user_id, inv.cohort, null)
    on conflict (user_id, cohort) do nothing;

    update public.cohort_invites set consumed_at = now() where id = inv.id;

    return next inv.cohort;
  end loop;
  return;
end;
$$;

grant execute on function public.consume_cohort_invites(uuid, text) to authenticated;

-- Admin-side direct assignment (existing app user, found by email/name in
-- the admin UI, no invite round-trip needed).
create or replace function public.assign_cohort(p_user_id uuid, p_cohort public.cohort_name)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  insert into public.cohort_memberships (user_id, cohort, assigned_by)
  values (p_user_id, p_cohort, auth.uid())
  on conflict (user_id, cohort) do nothing;

  return true;
end;
$$;

grant execute on function public.assign_cohort(uuid, public.cohort_name) to authenticated;

create or replace function public.remove_cohort(p_user_id uuid, p_cohort public.cohort_name)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  delete from public.cohort_memberships where user_id = p_user_id and cohort = p_cohort;
  return true;
end;
$$;

grant execute on function public.remove_cohort(uuid, public.cohort_name) to authenticated;


-- ============================================================
-- WEEKLY PRODUCTSLICE DIGEST (§J.5-J.6)
-- ============================================================

create type public.digest_status as enum ('draft', 'approved', 'sent');

-- One row per weekly issue. The five content slots are nullable FKs into
-- content/case_library_entries/etc — assembled from real, already-
-- published rows only (see packages/api-client/src/digest.ts), never
-- free-text generated content. thing_to_try is the one slot that's
-- genuinely just a short call-to-action, not a content reference, so it
-- stays a plain text field the admin can edit before approving.
create table public.digest_issues (
  id                        uuid primary key default gen_random_uuid(),
  week_of                   date not null,
  status                    public.digest_status not null default 'draft',
  subject                   text not null default 'ProductSlice Weekly',
  insight_content_id        uuid references public.content (id) on delete set null,
  resource_content_id       uuid references public.content (id) on delete set null,
  build_note_content_id     uuid references public.content (id) on delete set null,
  community_highlight_type  text, -- 'top_contributor' | 'popular_comment' | 'new_achievement_earner'
  community_highlight_user_id uuid references public.users (id) on delete set null,
  community_highlight_note text,
  thing_to_try              text,
  topic_id                  uuid references public.topics (id) on delete set null, -- null = sent to everyone, not topic-segmented
  created_at                timestamptz not null default now(),
  created_by                uuid references public.users (id) on delete set null,
  approved_at               timestamptz,
  approved_by               uuid references public.users (id) on delete set null,
  sent_at                   timestamptz
);

alter table public.digest_issues enable row level security;
create policy "digest_issues: admin all" on public.digest_issues for all using (public.is_admin()) with check (public.is_admin());

-- One row per (issue, recipient) — this is what makes delivered/opened/
-- clicked/unsubscribed/returned real, per-member, queryable facts instead
-- of aggregate guesses. `returned_at` is set the first time that user's
-- next dashboard_viewed or content_opened analytics_events row lands
-- after delivered_at (packages/api-client/src/digest.ts computes it from
-- the existing analytics_events table — not a duplicate tracking path).
create table public.digest_recipients (
  id                uuid primary key default gen_random_uuid(),
  digest_issue_id   uuid not null references public.digest_issues (id) on delete cascade,
  user_id           uuid not null references public.users (id) on delete cascade,
  resend_email_id   text, -- matches Resend's own id, so its opened/clicked webhook can find this row
  unsubscribe_token uuid not null default gen_random_uuid(), -- one-click unsubscribe link, no login needed
  delivered_at      timestamptz,
  opened_at         timestamptz,
  clicked_at        timestamptz,
  unsubscribed_at   timestamptz,
  returned_at       timestamptz,
  unique (digest_issue_id, user_id)
);

create index digest_recipients_resend_email_id_idx on public.digest_recipients (resend_email_id);
create index digest_recipients_unsubscribe_token_idx on public.digest_recipients (unsubscribe_token);

create index digest_recipients_issue_idx on public.digest_recipients (digest_issue_id);
create index digest_recipients_user_idx on public.digest_recipients (user_id);

alter table public.digest_recipients enable row level security;
create policy "digest_recipients: admin all" on public.digest_recipients for all using (public.is_admin()) with check (public.is_admin());
create policy "digest_recipients: self read" on public.digest_recipients for select using (auth.uid() = user_id);

comment on table public.digest_issues is 'Epic J §J.5/§J.6 — one row per weekly ProductSlice Weekly issue. Admin reviews and approves before send; nothing here auto-sends.';
comment on table public.digest_recipients is 'Per-recipient delivery/engagement tracking for one digest_issues row — backs the delivered/opened/clicked/unsubscribed/returned metrics §J.6 asks for.';
