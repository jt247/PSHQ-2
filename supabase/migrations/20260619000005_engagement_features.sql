-- ============================================================
-- Migration 005: Engagement features
-- - review_text on ratings
-- - bullet_points + key_concepts on ai_summaries
-- - ai_summary_requested added to interaction_type enum
-- ============================================================

-- Extend interaction_type enum
alter type public.interaction_type add value if not exists 'ai_summary_requested';

-- Add optional written review to ratings
alter table public.ratings
  add column if not exists review_text text,
  add column if not exists updated_at timestamptz not null default now();

-- Add structured fields to ai_summaries
alter table public.ai_summaries
  add column if not exists bullet_points jsonb,      -- array of strings
  add column if not exists key_concepts  jsonb;      -- array of strings

-- Trigger to keep ratings.updated_at fresh
create or replace function public.touch_ratings_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_ratings_updated_at
  before update on public.ratings
  for each row execute procedure public.touch_ratings_updated_at();

-- Invalidate (delete) cached AI summary when content is republished or body changes.
-- The application re-generates on next request.
create or replace function public.invalidate_ai_summary()
  returns trigger language plpgsql security definer as $$
begin
  if (old.status <> new.status and new.status = 'published')
     or old.body is distinct from new.body then
    delete from public.ai_summaries where content_id = new.id;
  end if;
  return new;
end;
$$;

create trigger invalidate_ai_summary_on_content_update
  after update on public.content
  for each row execute procedure public.invalidate_ai_summary();

-- RLS: allow users to update their own rating (for review_text edits)
-- (existing self-update policy covers the row; this just ensures the column is writable)
