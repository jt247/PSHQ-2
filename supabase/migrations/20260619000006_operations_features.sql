-- ============================================================
-- Migration 006: Operations features
-- Support system, content requests, notifications, payments,
-- ratings moderation.
-- ============================================================

-- ── support_tickets ──────────────────────────────────────────
-- Make user_id nullable (public contact form submissions have no account)
alter table public.support_tickets alter column user_id drop not null;

-- Add description / body for the initial message
alter table public.support_tickets
  add column if not exists description   text,
  add column if not exists content_id    uuid references public.content (id) on delete set null,
  add column if not exists email         text; -- for anonymous submissions

-- Ticket number: human-readable ID
create sequence if not exists public.ticket_number_seq start 1000;
alter table public.support_tickets
  add column if not exists ticket_number bigint not null default nextval('public.ticket_number_seq');

create unique index if not exists support_tickets_ticket_number_idx
  on public.support_tickets (ticket_number);

-- ── ticket_replies ────────────────────────────────────────────
alter table public.ticket_replies
  add column if not exists image_url text;

-- ── notifications ─────────────────────────────────────────────
alter table public.notifications
  add column if not exists channel          text not null default 'in_app'
    check (channel in ('in_app', 'email', 'both')),
  add column if not exists audience_filters jsonb,   -- see broadcast composer
  add column if not exists sent_at          timestamptz;

-- ── ratings ───────────────────────────────────────────────────
alter table public.ratings
  add column if not exists is_hidden boolean not null default false;

-- Admin can hide reviews; public read policy already exists
-- We restrict hidden reviews from public visibility via policy update
drop policy if exists "ratings: public read" on public.ratings;
create policy "ratings: public read non-hidden"
  on public.ratings for select
  using (is_hidden = false or public.is_admin());

-- ── content_requests ──────────────────────────────────────────
alter table public.content_requests
  add column if not exists content_type_requested text
    check (content_type_requested in ('article', 'ebook', 'template', 'course'));

-- ── Additional RLS ────────────────────────────────────────────

-- Allow admins to update ratings (set is_hidden)
create policy "ratings: admin update"
  on public.ratings for update
  using (public.is_admin())
  with check (public.is_admin());

-- Allow admins to view all tickets
create policy "tickets: admin full access"
  on public.support_tickets for all
  using (public.is_admin())
  with check (public.is_admin());

-- Allow users to see their own tickets
create policy "tickets: self read"
  on public.support_tickets for select
  using (auth.uid() is not null and auth.uid() = user_id);

-- Allow authenticated users to create tickets
create policy "tickets: auth insert"
  on public.support_tickets for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

-- Allow admins to manage replies
create policy "replies: admin full access"
  on public.ticket_replies for all
  using (public.is_admin())
  with check (public.is_admin());

-- Allow users to read non-internal replies on their own tickets
create policy "replies: user read own ticket"
  on public.ticket_replies for select
  using (
    is_internal = false and
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

-- Allow users to post replies on their own tickets
create policy "replies: user insert own ticket"
  on public.ticket_replies for insert
  with check (
    auth.uid() is not null and
    auth.uid() = user_id and
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

-- Content requests RLS
create policy "requests: auth insert"
  on public.content_requests for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "requests: self read"
  on public.content_requests for select
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "requests: public read"
  on public.content_requests for select
  using (status in ('planned', 'completed'));

create policy "requests: admin full access"
  on public.content_requests for all
  using (public.is_admin())
  with check (public.is_admin());

-- Notifications
create policy "notifications: admin write"
  on public.notifications for insert
  with check (public.is_admin());

create policy "notifications: admin read"
  on public.notifications for select
  using (public.is_admin());

create policy "notification_recipients: user read own"
  on public.notification_recipients for select
  using (auth.uid() = user_id);

create policy "notification_recipients: user update own"
  on public.notification_recipients for update
  using (auth.uid() = user_id);

create policy "notification_recipients: admin insert"
  on public.notification_recipients for insert
  with check (public.is_admin());

-- Purchases: update for admin read so payments dashboard works
create policy "purchases: admin read"
  on public.purchases for select
  using (public.is_admin());
