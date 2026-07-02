-- Migration 019: Add featured to content_stats view
-- The view was missing this column, causing the admin featured toggle to malfunction.

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
  c.created_at,
  c.featured
FROM public.content c;

GRANT SELECT ON public.content_stats TO authenticated;
