-- Add onboarding fields used after OAuth sign-up.
-- These are collected in the one-time onboarding step before the dashboard.

alter table public.users
  add column if not exists first_name        text,
  add column if not exists last_name         text,
  add column if not exists job_role          text,
  add column if not exists country           text,
  add column if not exists areas_of_interest text[] not null default '{}',
  add column if not exists onboarding_done   boolean not null default false,
  add column if not exists auth_provider     text not null default 'email';

comment on column public.users.onboarding_done is 'Set true after the post-OAuth onboarding step is completed.';
comment on column public.users.auth_provider is 'email | google';
