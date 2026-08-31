-- ============================================================
-- Migration 003: Content pricing fields + new content types
-- ============================================================

-- Add new content types (can't remove old ones from enums in PG,
-- but new content will only use the four types below).
ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'ebook';
ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'template';
ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'course';

-- Add unlock interaction type for free content access tracking.
ALTER TYPE public.interaction_type ADD VALUE IF NOT EXISTS 'unlock';

-- Add pricing + file fields to content.
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS pricing_type  text NOT NULL DEFAULT 'free'
    CHECK (pricing_type IN ('free', 'paid')),
  ADD COLUMN IF NOT EXISTS price_amount  integer,
  ADD COLUMN IF NOT EXISTS currency      text NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS file_url      text;

-- NOTE: content_stats view is created in migration 003b.
-- It must be a separate transaction because PostgreSQL prohibits using
-- a newly-added enum value ('unlock') in the same transaction it was added.
