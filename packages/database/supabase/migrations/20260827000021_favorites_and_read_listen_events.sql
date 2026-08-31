-- ----------------------------------------------------------
-- New interaction types: 'read' and 'listen'
--
-- 'view' already fires on both the content detail page visit AND on
-- opening the inline reader (/api/view) — the sync_view_count trigger
-- only checks `new.type = 'view'`, so adding these two new enum values
-- is purely additive and cannot change what view_count means today.
-- 'read' becomes a distinct, more specific signal for "actually opened
-- the reader" on ebooks/templates; 'listen' tracks text-to-speech usage
-- on articles. Neither is referenced elsewhere in this same transaction,
-- which Postgres requires for ALTER TYPE ... ADD VALUE.
-- ----------------------------------------------------------
alter type public.interaction_type add value 'read';
alter type public.interaction_type add value 'listen';


-- ----------------------------------------------------------
-- content_favorites
-- A user's personal saved list, separate from what they've merely viewed
-- or downloaded. Same shape as content_upvotes, but private — no reason
-- for another user to see what someone has favorited.
-- ----------------------------------------------------------
create table public.content_favorites (
  id                uuid primary key default gen_random_uuid(),
  content_id        uuid not null references public.content (id) on delete cascade,
  user_id           uuid not null references public.users (id) on delete cascade,
  created_at        timestamptz not null default now(),
  unique (content_id, user_id)
);

alter table public.content_favorites enable row level security;

create policy "favorites: self read"
  on public.content_favorites for select
  using (auth.uid() = user_id);

create policy "favorites: self insert"
  on public.content_favorites for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "favorites: self delete"
  on public.content_favorites for delete
  using (auth.uid() = user_id);

create index content_favorites_user_id_idx on public.content_favorites (user_id);
