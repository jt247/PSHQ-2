-- Admin invites table: tracks pending admin invitations
create table if not exists public.admin_invites (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  team_role  public.team_role not null,
  token      text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at    timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index on public.admin_invites (token) where used_at is null;
create index on public.admin_invites (email);

-- Only super_admins (via service role) can read/write invites
alter table public.admin_invites enable row level security;

drop policy if exists "service role full access on admin_invites" on public.admin_invites;
create policy "service role full access on admin_invites"
  on public.admin_invites for all
  using (true)
  with check (true);
