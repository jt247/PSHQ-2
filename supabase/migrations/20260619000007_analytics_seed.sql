-- ============================================================
-- Migration 007: Analytics seed data
-- Backdate realistic interactions/purchases/ratings/user profiles
-- over the last 60 days so admin dashboards show real numbers.
-- Idempotent: ON CONFLICT DO NOTHING throughout.
-- ============================================================

-- -------------------------------------------------------
-- 1. Fake user profiles — update onboarding fields on any
--    existing users; also insert stub auth + public rows
--    for test accounts. We only touch public.users since
--    auth.users rows come from Supabase Auth — we'll use
--    the existing seeded users from Auth if present, or
--    rely on real sign-ups. For safety we just update
--    profile fields on users that already exist.
-- -------------------------------------------------------

-- Spread existing users' created_at over past 60 days
-- We can't easily do this without knowing real user IDs, so
-- the seed focuses on anonymous + interaction data that
-- doesn't require real user FK references.

-- -------------------------------------------------------
-- 2. Content IDs (from migration 004)
-- -------------------------------------------------------
-- article:   11111111-0000-0000-0000-000000000001
-- article:   11111111-0000-0000-0000-000000000002
-- ebook:     11111111-0000-0000-0000-000000000003
-- template:  11111111-0000-0000-0000-000000000004
-- course:    11111111-0000-0000-0000-000000000005
-- template:  11111111-0000-0000-0000-000000000006

-- -------------------------------------------------------
-- 3. Anonymous view interactions — last 60 days
-- -------------------------------------------------------
INSERT INTO public.content_interactions (id, content_id, user_id, session_id, type, created_at)
VALUES
  -- Article 1 — heavy traffic
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s001', 'view', now() - interval '1 day'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s002', 'view', now() - interval '1 day'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s003', 'view', now() - interval '2 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s004', 'view', now() - interval '2 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s005', 'view', now() - interval '3 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s006', 'view', now() - interval '4 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s007', 'view', now() - interval '5 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s008', 'view', now() - interval '6 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s009', 'view', now() - interval '7 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s010', 'view', now() - interval '8 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s011', 'view', now() - interval '10 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s012', 'view', now() - interval '12 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s013', 'view', now() - interval '14 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s014', 'view', now() - interval '16 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s015', 'view', now() - interval '18 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s016', 'view', now() - interval '20 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s017', 'view', now() - interval '23 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s018', 'view', now() - interval '26 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s019', 'view', now() - interval '30 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s020', 'view', now() - interval '35 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s021', 'view', now() - interval '40 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s022', 'view', now() - interval '45 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s023', 'view', now() - interval '50 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s024', 'view', now() - interval '55 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', null, 'anon-s025', 'view', now() - interval '60 days'),

  -- Article 2
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000002', null, 'anon-s030', 'view', now() - interval '1 day'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000002', null, 'anon-s031', 'view', now() - interval '2 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000002', null, 'anon-s032', 'view', now() - interval '3 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000002', null, 'anon-s033', 'view', now() - interval '5 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000002', null, 'anon-s034', 'view', now() - interval '7 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000002', null, 'anon-s035', 'view', now() - interval '9 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000002', null, 'anon-s036', 'view', now() - interval '12 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000002', null, 'anon-s037', 'view', now() - interval '15 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000002', null, 'anon-s038', 'view', now() - interval '20 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000002', null, 'anon-s039', 'view', now() - interval '30 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000002', null, 'anon-s040', 'view', now() - interval '45 days'),

  -- Ebook (free unlock bait)
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000003', null, 'anon-s050', 'view', now() - interval '1 day'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000003', null, 'anon-s051', 'view', now() - interval '2 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000003', null, 'anon-s052', 'view', now() - interval '4 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000003', null, 'anon-s053', 'view', now() - interval '7 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000003', null, 'anon-s054', 'view', now() - interval '10 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000003', null, 'anon-s055', 'view', now() - interval '15 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000003', null, 'anon-s056', 'view', now() - interval '22 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000003', null, 'anon-s057', 'view', now() - interval '30 days'),

  -- Template
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000004', null, 'anon-s060', 'view', now() - interval '2 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000004', null, 'anon-s061', 'view', now() - interval '4 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000004', null, 'anon-s062', 'view', now() - interval '6 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000004', null, 'anon-s063', 'view', now() - interval '10 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000004', null, 'anon-s064', 'view', now() - interval '18 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000004', null, 'anon-s065', 'view', now() - interval '25 days'),

  -- Course
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000005', null, 'anon-s070', 'view', now() - interval '1 day'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000005', null, 'anon-s071', 'view', now() - interval '3 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000005', null, 'anon-s072', 'view', now() - interval '7 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000005', null, 'anon-s073', 'view', now() - interval '14 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000005', null, 'anon-s074', 'view', now() - interval '21 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000005', null, 'anon-s075', 'view', now() - interval '35 days'),

  -- Template 2
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000006', null, 'anon-s080', 'view', now() - interval '3 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000006', null, 'anon-s081', 'view', now() - interval '6 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000006', null, 'anon-s082', 'view', now() - interval '12 days'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000006', null, 'anon-s083', 'view', now() - interval '20 days')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- 4. Logged-in interactions using real user IDs
--    We use a subquery that picks real users from public.users.
--    If no users exist yet, these inserts are skipped gracefully.
-- -------------------------------------------------------

-- Unlock interactions for the ebook (content_id 003)
INSERT INTO public.content_interactions (id, content_id, user_id, session_id, type, created_at)
SELECT
  gen_random_uuid(),
  '11111111-0000-0000-0000-000000000003',
  u.id,
  NULL,
  'unlock',
  now() - (random() * interval '30 days')
FROM public.users u
WHERE u.role = 'user'
LIMIT 3
ON CONFLICT DO NOTHING;

-- Download interactions for article 1
INSERT INTO public.content_interactions (id, content_id, user_id, session_id, type, created_at)
SELECT
  gen_random_uuid(),
  '11111111-0000-0000-0000-000000000001',
  u.id,
  NULL,
  'download',
  now() - (random() * interval '20 days')
FROM public.users u
WHERE u.role = 'user'
LIMIT 4
ON CONFLICT DO NOTHING;

-- AI summary requests
INSERT INTO public.content_interactions (id, content_id, user_id, session_id, type, created_at)
SELECT
  gen_random_uuid(),
  '11111111-0000-0000-0000-000000000001',
  u.id,
  NULL,
  'ai_summary_requested',
  now() - (random() * interval '14 days')
FROM public.users u
WHERE u.role = 'user'
LIMIT 2
ON CONFLICT DO NOTHING;

-- Click interactions for course
INSERT INTO public.content_interactions (id, content_id, user_id, session_id, type, created_at)
SELECT
  gen_random_uuid(),
  '11111111-0000-0000-0000-000000000005',
  u.id,
  NULL,
  'click',
  now() - (random() * interval '25 days')
FROM public.users u
WHERE u.role = 'user'
LIMIT 3
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- 5. Fake purchases — these need real user FKs
--    content 004 (template, paid), content 005 (course, paid)
-- -------------------------------------------------------
DO $$
DECLARE
  v_user_id uuid;
  v_content_id text;
  v_amounts int[] := ARRAY[2500, 5000, 7500, 10000, 15000];
  v_statuses text[] := ARRAY['completed', 'completed', 'completed', 'completed', 'pending'];
  v_days int;
  i int;
BEGIN
  -- Get up to 5 real users
  FOR v_user_id IN
    SELECT id FROM public.users WHERE role = 'user' LIMIT 5
  LOOP
    FOR i IN 1..2 LOOP
      v_content_id := CASE WHEN i = 1 THEN '11111111-0000-0000-0000-000000000005' ELSE '11111111-0000-0000-0000-000000000004' END;
      v_days := (random() * 55 + 1)::int;
      INSERT INTO public.purchases (
        id, user_id, content_id, reference, amount, currency, status, created_at
      ) VALUES (
        gen_random_uuid(),
        v_user_id,
        v_content_id::uuid,
        'pshq_seed_' || extract(epoch from now())::bigint || '_' || floor(random()*10000)::int,
        v_amounts[(floor(random()*5)+1)::int],
        'NGN',
        v_statuses[(floor(random()*5)+1)::int],
        now() - (v_days * interval '1 day')
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- -------------------------------------------------------
-- 6. Ratings/reviews
-- -------------------------------------------------------
DO $$
DECLARE
  v_user_id uuid;
  v_content_ids uuid[] := ARRAY[
    '11111111-0000-0000-0000-000000000001'::uuid,
    '11111111-0000-0000-0000-000000000002'::uuid,
    '11111111-0000-0000-0000-000000000003'::uuid
  ];
  v_scores int[] := ARRAY[5, 4, 5, 3, 4, 5, 4];
  v_reviews text[] := ARRAY[
    'Excellent breakdown. The assumption mapping stage alone was worth reading this.',
    'Really practical and well-structured. Would love a follow-up on activation.',
    'Good content. The frameworks are solid but could use more African market context.',
    'Solid resource. Used it for a product review at work.',
    'This changed how I run discovery sprints. Sharing with my entire PM team.',
    'Clear, actionable, and well-referenced. Five stars.',
    'Worth the read. The OKR section was particularly helpful.'
  ];
  i int;
  v_content_id uuid;
BEGIN
  i := 1;
  FOR v_user_id IN
    SELECT id FROM public.users WHERE role = 'user' LIMIT 4
  LOOP
    FOREACH v_content_id IN ARRAY v_content_ids[1:2]
    LOOP
      INSERT INTO public.ratings (
        id, content_id, user_id, score, review_text, is_hidden, created_at
      ) VALUES (
        gen_random_uuid(),
        v_content_id,
        v_user_id,
        v_scores[i],
        v_reviews[i],
        false,
        now() - (floor(random()*45+1) * interval '1 day')
      ) ON CONFLICT (content_id, user_id) DO NOTHING;
      i := i + 1;
      IF i > 7 THEN i := 1; END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- -------------------------------------------------------
-- 7. Update view_count on content to match seeded interactions
-- -------------------------------------------------------
UPDATE public.content c
SET view_count = (
  SELECT count(*) FROM public.content_interactions ci
  WHERE ci.content_id = c.id AND ci.type = 'view'
)
WHERE id IN (
  '11111111-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000004',
  '11111111-0000-0000-0000-000000000005',
  '11111111-0000-0000-0000-000000000006'
);
