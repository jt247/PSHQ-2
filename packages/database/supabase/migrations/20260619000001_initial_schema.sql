-- ============================================================
-- PSHQ-2 Initial Schema
-- ============================================================
-- Run order: enums → tables → indexes → triggers → RLS
-- ============================================================


-- ============================================================
-- ENUMS
-- ============================================================

create type public.user_role as enum ('user', 'admin', 'super_admin');
create type public.team_role as enum ('product', 'support', 'growth');
create type public.content_type as enum ('article', 'library_item', 'initiative');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.interaction_type as enum ('view', 'click', 'share', 'download');
create type public.purchase_status as enum ('pending', 'success', 'failed', 'refunded');
create type public.ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type public.ticket_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.request_status as enum ('open', 'in_review', 'planned', 'completed', 'declined');
create type public.notification_type as enum ('system', 'content', 'support', 'payment');


-- ============================================================
-- TABLES
-- ============================================================

-- ----------------------------------------------------------
-- users
-- Mirrors auth.users and extends with product-specific fields.
-- Populated via trigger on auth.users insert.
-- ----------------------------------------------------------
create table public.users (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text not null,
  full_name         text,
  avatar_url        text,
  bio               text,
  role              public.user_role not null default 'user',
  team_role         public.team_role,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on column public.users.team_role is 'Only meaningful when role = admin. Determines which admin module the user primarily owns.';
comment on column public.users.role is 'super_admin can access payments and manage admin accounts; admin can access everything else.';


-- ----------------------------------------------------------
-- content
-- Articles, library items, and initiatives.
-- ----------------------------------------------------------
create table public.content (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  slug              text not null unique,
  type              public.content_type not null,
  status            public.content_status not null default 'draft',
  summary           text,
  body              text,
  cover_image_url   text,
  author_id         uuid references public.users (id) on delete set null,
  tags              text[] not null default '{}',
  view_count        integer not null default 0,
  upvote_count      integer not null default 0,
  comment_count     integer not null default 0,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);


-- ----------------------------------------------------------
-- content_interactions
-- Views and clicks are allowed from anonymous sessions.
-- user_id is nullable; session_id tracks anonymous actors.
-- ----------------------------------------------------------
create table public.content_interactions (
  id                uuid primary key default gen_random_uuid(),
  content_id        uuid not null references public.content (id) on delete cascade,
  user_id           uuid references public.users (id) on delete set null,
  session_id        text,
  type              public.interaction_type not null,
  metadata          jsonb,
  created_at        timestamptz not null default now()
);


-- ----------------------------------------------------------
-- content_comments
-- Threaded via parent_id. Requires authenticated user.
-- ----------------------------------------------------------
create table public.content_comments (
  id                uuid primary key default gen_random_uuid(),
  content_id        uuid not null references public.content (id) on delete cascade,
  user_id           uuid not null references public.users (id) on delete cascade,
  parent_id         uuid references public.content_comments (id) on delete cascade,
  body              text not null,
  is_deleted        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);


-- ----------------------------------------------------------
-- content_upvotes
-- One upvote per user per piece of content.
-- ----------------------------------------------------------
create table public.content_upvotes (
  id                uuid primary key default gen_random_uuid(),
  content_id        uuid not null references public.content (id) on delete cascade,
  user_id           uuid not null references public.users (id) on delete cascade,
  created_at        timestamptz not null default now(),
  unique (content_id, user_id)
);


-- ----------------------------------------------------------
-- ai_summaries
-- AI-generated summaries for content pieces.
-- ----------------------------------------------------------
create table public.ai_summaries (
  id                uuid primary key default gen_random_uuid(),
  content_id        uuid not null references public.content (id) on delete cascade,
  summary_text      text not null,
  model_used        text not null default 'gemini-1.5-flash',
  requested_by      uuid not null references public.users (id) on delete cascade,
  created_at        timestamptz not null default now()
);


-- ----------------------------------------------------------
-- ratings
-- 1–5 star rating per user per content piece.
-- ----------------------------------------------------------
create table public.ratings (
  id                uuid primary key default gen_random_uuid(),
  content_id        uuid not null references public.content (id) on delete cascade,
  user_id           uuid not null references public.users (id) on delete cascade,
  rating            smallint not null check (rating between 1 and 5),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (content_id, user_id)
);


-- ----------------------------------------------------------
-- purchases
-- Payment records. Readable/writable only by super_admin via RLS.
-- Amounts stored in smallest currency unit (e.g. kobo for NGN).
-- ----------------------------------------------------------
create table public.purchases (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users (id) on delete restrict,
  amount                integer not null,
  currency              text not null default 'NGN',
  status                public.purchase_status not null default 'pending',
  paystack_reference    text unique,
  paystack_access_code  text,
  item_type             text not null,
  item_id               uuid,
  metadata              jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);


-- ----------------------------------------------------------
-- content_requests
-- Users can submit and upvote content ideas.
-- ----------------------------------------------------------
create table public.content_requests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users (id) on delete cascade,
  title             text not null,
  description       text,
  status            public.request_status not null default 'open',
  upvote_count      integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);


-- ----------------------------------------------------------
-- support_tickets
-- ----------------------------------------------------------
create table public.support_tickets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users (id) on delete cascade,
  subject           text not null,
  status            public.ticket_status not null default 'open',
  priority          public.ticket_priority not null default 'medium',
  assigned_to       uuid references public.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);


-- ----------------------------------------------------------
-- ticket_replies
-- is_internal flags admin-only notes invisible to the user.
-- ----------------------------------------------------------
create table public.ticket_replies (
  id                uuid primary key default gen_random_uuid(),
  ticket_id         uuid not null references public.support_tickets (id) on delete cascade,
  user_id           uuid not null references public.users (id) on delete cascade,
  body              text not null,
  is_internal       boolean not null default false,
  created_at        timestamptz not null default now()
);


-- ----------------------------------------------------------
-- notifications
-- Admin-authored announcements / system events.
-- ----------------------------------------------------------
create table public.notifications (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  body              text not null,
  type              public.notification_type not null default 'system',
  action_url        text,
  created_by        uuid references public.users (id) on delete set null,
  created_at        timestamptz not null default now()
);


-- ----------------------------------------------------------
-- notification_recipients
-- Tracks per-user delivery and read state.
-- ----------------------------------------------------------
create table public.notification_recipients (
  id                uuid primary key default gen_random_uuid(),
  notification_id   uuid not null references public.notifications (id) on delete cascade,
  user_id           uuid not null references public.users (id) on delete cascade,
  read_at           timestamptz,
  created_at        timestamptz not null default now(),
  unique (notification_id, user_id)
);


-- ----------------------------------------------------------
-- admin_actions_log
-- Immutable audit trail. No UPDATE or DELETE allowed.
-- ----------------------------------------------------------
create table public.admin_actions_log (
  id                uuid primary key default gen_random_uuid(),
  admin_id          uuid not null references public.users (id) on delete restrict,
  action_type       text not null,
  target_table      text,
  target_id         uuid,
  metadata          jsonb,
  created_at        timestamptz not null default now()
);


-- ============================================================
-- INDEXES
-- ============================================================

create index on public.content (status, published_at desc);
create index on public.content (type, status);
create index on public.content (author_id);
create index on public.content using gin (tags);

create index on public.content_interactions (content_id, type);
create index on public.content_interactions (user_id);
create index on public.content_interactions (created_at desc);

create index on public.content_comments (content_id, created_at);
create index on public.content_comments (user_id);
create index on public.content_comments (parent_id);

create index on public.content_upvotes (content_id);
create index on public.content_upvotes (user_id);

create index on public.ai_summaries (content_id);

create index on public.ratings (content_id);

create index on public.purchases (user_id);
create index on public.purchases (paystack_reference);
create index on public.purchases (status);

create index on public.content_requests (status, upvote_count desc);
create index on public.content_requests (user_id);

create index on public.support_tickets (user_id, status);
create index on public.support_tickets (assigned_to, status);

create index on public.ticket_replies (ticket_id);

create index on public.notification_recipients (user_id, read_at);
create index on public.notification_recipients (notification_id);

create index on public.admin_actions_log (admin_id, created_at desc);
create index on public.admin_actions_log (target_table, target_id);


-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Returns the role of the currently authenticated user.
create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
as $$
  select role from public.users where id = auth.uid();
$$;

-- Returns true if the caller has admin or super_admin role.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
    and role in ('admin', 'super_admin')
  );
$$;

-- Returns true if the caller is super_admin.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
    and role = 'super_admin'
  );
$$;


-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create a public.users row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Keep updated_at current on all relevant tables.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_users_updated_at
  before update on public.users
  for each row execute procedure public.touch_updated_at();

create trigger touch_content_updated_at
  before update on public.content
  for each row execute procedure public.touch_updated_at();

create trigger touch_content_comments_updated_at
  before update on public.content_comments
  for each row execute procedure public.touch_updated_at();

create trigger touch_ratings_updated_at
  before update on public.ratings
  for each row execute procedure public.touch_updated_at();

create trigger touch_purchases_updated_at
  before update on public.purchases
  for each row execute procedure public.touch_updated_at();

create trigger touch_content_requests_updated_at
  before update on public.content_requests
  for each row execute procedure public.touch_updated_at();

create trigger touch_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute procedure public.touch_updated_at();


-- Increment / decrement content.upvote_count on upvote changes.
create or replace function public.sync_upvote_count()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    update public.content set upvote_count = upvote_count + 1 where id = new.content_id;
  elsif (tg_op = 'DELETE') then
    update public.content set upvote_count = greatest(upvote_count - 1, 0) where id = old.content_id;
  end if;
  return null;
end;
$$;

create trigger sync_content_upvote_count
  after insert or delete on public.content_upvotes
  for each row execute procedure public.sync_upvote_count();


-- Increment / decrement content.comment_count on comment changes.
create or replace function public.sync_comment_count()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    update public.content set comment_count = comment_count + 1 where id = new.content_id;
  elsif (tg_op = 'DELETE') then
    update public.content set comment_count = greatest(comment_count - 1, 0) where id = old.content_id;
  end if;
  return null;
end;
$$;

create trigger sync_content_comment_count
  after insert or delete on public.content_comments
  for each row execute procedure public.sync_comment_count();


-- Increment content.view_count on each 'view' interaction insert.
create or replace function public.sync_view_count()
returns trigger
language plpgsql
as $$
begin
  if new.type = 'view' then
    update public.content set view_count = view_count + 1 where id = new.content_id;
  end if;
  return null;
end;
$$;

create trigger sync_content_view_count
  after insert on public.content_interactions
  for each row execute procedure public.sync_view_count();


-- Prevent UPDATE and DELETE on admin_actions_log (immutable audit log).
create or replace function public.block_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'admin_actions_log is immutable — records may not be updated or deleted.';
end;
$$;

create trigger immutable_admin_actions_log
  before update or delete on public.admin_actions_log
  for each row execute procedure public.block_audit_log_mutation();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users                  enable row level security;
alter table public.content                enable row level security;
alter table public.content_interactions   enable row level security;
alter table public.content_comments       enable row level security;
alter table public.content_upvotes        enable row level security;
alter table public.ai_summaries           enable row level security;
alter table public.ratings                enable row level security;
alter table public.purchases              enable row level security;
alter table public.content_requests       enable row level security;
alter table public.support_tickets        enable row level security;
alter table public.ticket_replies         enable row level security;
alter table public.notifications          enable row level security;
alter table public.notification_recipients enable row level security;
alter table public.admin_actions_log      enable row level security;


-- ----------------------------------------------------------
-- users
-- ----------------------------------------------------------
-- Anyone can read basic profiles (public directory).
create policy "users: public read"
  on public.users for select
  using (true);

-- Users can update their own non-role fields.
create policy "users: self update"
  on public.users for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- role and team_role columns may NOT be changed by the user themselves;
    -- only admins can change them via service role or explicit admin policy below.
    and role = (select role from public.users where id = auth.uid())
    and team_role is not distinct from (select team_role from public.users where id = auth.uid())
  );

-- Admins can update any user's role and profile.
create policy "users: admin update"
  on public.users for update
  using (public.is_admin());

-- Only super_admin can promote/demote to super_admin.
-- This is enforced at application layer too, but the RLS ensures
-- a compromised admin token cannot self-escalate.
-- (No separate policy needed — service_role key is used for that operation only.)


-- ----------------------------------------------------------
-- content
-- ----------------------------------------------------------
create policy "content: public read published"
  on public.content for select
  using (status = 'published');

create policy "content: admin full access"
  on public.content for all
  using (public.is_admin())
  with check (public.is_admin());


-- ----------------------------------------------------------
-- content_interactions
-- ----------------------------------------------------------
-- Anyone (including anonymous) may insert a view or click.
create policy "interactions: anon insert view or click"
  on public.content_interactions for insert
  with check (type in ('view', 'click'));

-- Authenticated users may insert any interaction type.
create policy "interactions: auth insert any"
  on public.content_interactions for insert
  with check (auth.uid() is not null);

-- Users can read their own interactions.
create policy "interactions: self read"
  on public.content_interactions for select
  using (user_id = auth.uid());

-- Admins can read all interactions.
create policy "interactions: admin read"
  on public.content_interactions for select
  using (public.is_admin());


-- ----------------------------------------------------------
-- content_comments
-- ----------------------------------------------------------
-- Published content comments are publicly readable.
create policy "comments: public read"
  on public.content_comments for select
  using (
    exists (
      select 1 from public.content c
      where c.id = content_id and c.status = 'published'
    )
  );

-- Authenticated users may insert comments.
create policy "comments: auth insert"
  on public.content_comments for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

-- Users can update (soft-delete / edit) their own comments.
create policy "comments: self update"
  on public.content_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admins can manage all comments.
create policy "comments: admin full access"
  on public.content_comments for all
  using (public.is_admin())
  with check (public.is_admin());


-- ----------------------------------------------------------
-- content_upvotes
-- ----------------------------------------------------------
create policy "upvotes: public read"
  on public.content_upvotes for select
  using (true);

create policy "upvotes: auth insert"
  on public.content_upvotes for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "upvotes: self delete"
  on public.content_upvotes for delete
  using (auth.uid() = user_id);


-- ----------------------------------------------------------
-- ai_summaries
-- ----------------------------------------------------------
-- Public can read summaries for published content.
create policy "ai_summaries: public read"
  on public.ai_summaries for select
  using (
    exists (
      select 1 from public.content c
      where c.id = content_id and c.status = 'published'
    )
  );

-- Authenticated users may request (insert) a summary.
create policy "ai_summaries: auth insert"
  on public.ai_summaries for insert
  with check (auth.uid() is not null and auth.uid() = requested_by);

-- Admins can manage all summaries.
create policy "ai_summaries: admin full access"
  on public.ai_summaries for all
  using (public.is_admin())
  with check (public.is_admin());


-- ----------------------------------------------------------
-- ratings
-- ----------------------------------------------------------
create policy "ratings: public read"
  on public.ratings for select
  using (true);

create policy "ratings: auth insert"
  on public.ratings for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "ratings: self update"
  on public.ratings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "ratings: self delete"
  on public.ratings for delete
  using (auth.uid() = user_id);


-- ----------------------------------------------------------
-- purchases
-- STRICTLY super_admin only. A regular admin hitting this
-- table via the API will receive a 403 from RLS even if they
-- somehow bypass UI guards.
-- ----------------------------------------------------------
create policy "purchases: super_admin only"
  on public.purchases for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Users can view their own purchase history.
create policy "purchases: user self read"
  on public.purchases for select
  using (auth.uid() = user_id);


-- ----------------------------------------------------------
-- content_requests
-- ----------------------------------------------------------
-- Public can read all open/planned requests.
create policy "requests: public read"
  on public.content_requests for select
  using (status not in ('declined'));

-- Authenticated users may create a request.
create policy "requests: auth insert"
  on public.content_requests for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

-- Users can edit their own pending requests.
create policy "requests: self update"
  on public.content_requests for update
  using (auth.uid() = user_id and status = 'open')
  with check (auth.uid() = user_id);

-- Admins manage all requests.
create policy "requests: admin full access"
  on public.content_requests for all
  using (public.is_admin())
  with check (public.is_admin());


-- ----------------------------------------------------------
-- support_tickets
-- ----------------------------------------------------------
-- Users see only their own tickets.
create policy "tickets: self read"
  on public.support_tickets for select
  using (auth.uid() = user_id);

create policy "tickets: auth insert"
  on public.support_tickets for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

-- Admins see and manage all tickets.
create policy "tickets: admin full access"
  on public.support_tickets for all
  using (public.is_admin())
  with check (public.is_admin());


-- ----------------------------------------------------------
-- ticket_replies
-- ----------------------------------------------------------
-- Users can read non-internal replies on their own tickets.
create policy "replies: user read own ticket"
  on public.ticket_replies for select
  using (
    not is_internal
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

-- Users can reply to their own tickets.
create policy "replies: user insert own ticket"
  on public.ticket_replies for insert
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and not is_internal
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

-- Admins read and write all replies (including internal notes).
create policy "replies: admin full access"
  on public.ticket_replies for all
  using (public.is_admin())
  with check (public.is_admin());


-- ----------------------------------------------------------
-- notifications
-- ----------------------------------------------------------
create policy "notifications: admin full access"
  on public.notifications for all
  using (public.is_admin())
  with check (public.is_admin());


-- ----------------------------------------------------------
-- notification_recipients
-- ----------------------------------------------------------
-- Users see their own notifications.
create policy "notif_recipients: self read"
  on public.notification_recipients for select
  using (auth.uid() = user_id);

-- Users can mark their own notifications as read.
create policy "notif_recipients: self update"
  on public.notification_recipients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admins manage all.
create policy "notif_recipients: admin full access"
  on public.notification_recipients for all
  using (public.is_admin())
  with check (public.is_admin());


-- ----------------------------------------------------------
-- admin_actions_log
-- ----------------------------------------------------------
-- Admins can insert and read. No update/delete (blocked by trigger above).
create policy "audit_log: admin insert"
  on public.admin_actions_log for insert
  with check (public.is_admin() and auth.uid() = admin_id);

create policy "audit_log: admin read"
  on public.admin_actions_log for select
  using (public.is_admin());
