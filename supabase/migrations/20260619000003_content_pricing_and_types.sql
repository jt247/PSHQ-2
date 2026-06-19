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

-- ── Stats view for the admin Content Command Center ──────────────────────────
-- Aggregates interaction, purchase, and rating data per content item.
CREATE OR REPLACE VIEW public.content_stats AS
SELECT
  c.id,
  c.title,
  c.slug,
  c.type,
  c.status,
  c.pricing_type,
  c.price_amount,
  c.currency,
  c.summary,
  c.cover_image_url,
  c.tags,
  c.author_id,
  c.view_count,
  c.upvote_count,
  c.comment_count,
  c.published_at,
  c.created_at,
  c.updated_at,
  COALESCE((
    SELECT COUNT(*)::int FROM public.content_interactions ci
    WHERE ci.content_id = c.id AND ci.type = 'click'
  ), 0) AS click_count,
  COALESCE((
    SELECT COUNT(*)::int FROM public.content_interactions ci
    WHERE ci.content_id = c.id AND ci.type = 'unlock'
  ), 0) AS unlock_count,
  COALESCE((
    SELECT COUNT(*)::int FROM public.purchases p
    WHERE p.item_id = c.id AND p.status = 'success'
  ), 0) AS purchase_count,
  COALESCE((
    SELECT SUM(p.amount) FROM public.purchases p
    WHERE p.item_id = c.id AND p.status = 'success'
  ), 0)::bigint AS revenue_kobo,
  COALESCE((
    SELECT ROUND(AVG(r.rating)::numeric, 1) FROM public.ratings r
    WHERE r.content_id = c.id
  ), 0)::numeric AS avg_rating,
  COALESCE((
    SELECT COUNT(*)::int FROM public.ratings r
    WHERE r.content_id = c.id
  ), 0) AS rating_count,
  -- Conversion = purchases / views (%)
  CASE
    WHEN c.view_count > 0 THEN
      ROUND((
        SELECT COUNT(*)::numeric FROM public.purchases p
        WHERE p.item_id = c.id AND p.status = 'success'
      ) / c.view_count::numeric * 100, 2)
    ELSE 0
  END AS conversion_pct
FROM public.content c;

-- Admins can read the view; it inherits the underlying table's RLS indirectly
-- (we use SECURITY DEFINER on the view to allow admin reads).
GRANT SELECT ON public.content_stats TO authenticated;
