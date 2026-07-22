-- Migration 020: Lock down public.users table
-- "users: public read" (using true) let anyone with the anon key read every
-- user's email, full name, job role, country, and role column — including
-- who holds super_admin. Found via a live anonymous query against
-- production. Replaced with self-read + admin-read only.

drop policy if exists "users: public read" on public.users;

create policy "users: self read"
  on public.users for select
  using (auth.uid() = id);

create policy "users: admin read"
  on public.users for select
  using (public.is_admin());
