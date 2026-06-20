-- ============================================================
-- Migration 010: Selar architecture — remove payment infrastructure
-- ============================================================
-- The platform handles 0% of money. Selar handles 100%.
-- All in-platform payment tables, columns, and enums are removed.
-- ============================================================

-- 1. Drop content_stats view first (depends on purchases table)
DROP VIEW IF EXISTS public.content_stats;

-- 2. Drop purchases RLS policies
DROP POLICY IF EXISTS "purchases: super_admin only" ON public.purchases;

-- 3. Drop purchases trigger
DROP TRIGGER IF EXISTS touch_purchases_updated_at ON public.purchases;

-- 4. Drop purchases indexes
DROP INDEX IF EXISTS public.purchases_user_id_idx;
DROP INDEX IF EXISTS public.purchases_paystack_reference_idx;
DROP INDEX IF EXISTS public.purchases_status_idx;

-- 5. Drop purchases table
DROP TABLE IF EXISTS public.purchases;

-- 6. Drop purchase_status enum
DROP TYPE IF EXISTS public.purchase_status;

-- 7. Remove payment columns from content
ALTER TABLE public.content
  DROP COLUMN IF EXISTS price_amount,
  DROP COLUMN IF EXISTS currency;

-- 8. Add selar_url to content (nullable — only used when pricing_type = 'paid')
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS selar_url text;

-- 9. Add selar_click to interaction_type enum
-- (PostgreSQL requires this outside a transaction — run as a separate command)
ALTER TYPE public.interaction_type ADD VALUE IF NOT EXISTS 'selar_click';

-- 10. Recreate content_stats view without purchase data
CREATE OR REPLACE VIEW public.content_stats AS
SELECT
  c.id,
  c.title,
  c.slug,
  c.type,
  c.status,
  c.pricing_type,
  c.selar_url,
  c.view_count,
  c.upvote_count,
  c.comment_count,
  COALESCE(
    (SELECT COUNT(*)
     FROM public.content_interactions ci
     WHERE ci.content_id = c.id AND ci.type = 'selar_click'),
    0
  ) AS selar_clicks,
  COALESCE(
    (SELECT COUNT(*)
     FROM public.content_interactions ci
     WHERE ci.content_id = c.id AND ci.type = 'unlock'),
    0
  ) AS unlock_count,
  c.published_at,
  c.created_at
FROM public.content c;
