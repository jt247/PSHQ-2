-- ============================================================
-- Migration 003b: Content stats view
-- Must be separate from 003 because PostgreSQL does not allow
-- using a newly-added enum value in the same transaction it was added.
-- ============================================================

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
  CASE
    WHEN c.view_count > 0 THEN
      ROUND((
        SELECT COUNT(*)::numeric FROM public.purchases p
        WHERE p.item_id = c.id AND p.status = 'success'
      ) / c.view_count::numeric * 100, 2)
    ELSE 0
  END AS conversion_pct
FROM public.content c;

GRANT SELECT ON public.content_stats TO authenticated;
