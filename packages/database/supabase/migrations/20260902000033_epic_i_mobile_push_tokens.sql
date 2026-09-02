-- ----------------------------------------------------------
-- Epic I: Native Mobile App — push notification token storage.
--
-- Additive only, per standing rule 1. Does not touch notifications,
-- notification_preferences, or content_favorites/content_progress (all
-- reused as-is from Build Prompt 5/4 — see Step 6's shared-logic audit in
-- SIDENOTES.md for why nothing here duplicates those).
-- ----------------------------------------------------------

create table public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  token       text not null unique,
  platform    text not null check (platform in ('ios', 'android')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
create policy "push_tokens: self read"   on public.push_tokens for select using (auth.uid() = user_id);
create policy "push_tokens: self insert" on public.push_tokens for insert with check (auth.uid() = user_id);
create policy "push_tokens: self update" on public.push_tokens for update using (auth.uid() = user_id);
create policy "push_tokens: self delete" on public.push_tokens for delete using (auth.uid() = user_id);

comment on table public.push_tokens is 'One row per registered device (Expo push token). A user with the app on two devices has two rows. Admin Communications Center and achievement-unlock pushes both read this table via the service role.';
