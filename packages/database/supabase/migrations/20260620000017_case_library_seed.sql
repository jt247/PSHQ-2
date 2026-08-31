-- Migration 017: Case library interactions table + placeholder seed

-- ── Interactions log ───────────────────────────────────────────────────────
CREATE TABLE public.case_library_interactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id    uuid NOT NULL REFERENCES public.case_library_files (id) ON DELETE CASCADE,
  entry_id   uuid NOT NULL REFERENCES public.case_library_entries (id) ON DELETE CASCADE,
  user_id    uuid REFERENCES public.users (id) ON DELETE SET NULL,
  type       text NOT NULL DEFAULT 'download',
  metadata   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.case_library_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public insert case_library_interactions"
  ON public.case_library_interactions FOR INSERT WITH CHECK (true);

CREATE INDEX ON public.case_library_interactions (file_id, created_at DESC);
CREATE INDEX ON public.case_library_interactions (entry_id, type);

-- ── Seed 2 placeholder entries ─────────────────────────────────────────────
WITH entries AS (
  INSERT INTO public.case_library_entries
    (title, company_name, description, tags, status, published_at)
  VALUES
  (
    'How Paystack Simplified Payments for African Developers',
    'Paystack',
    'A deep dive into how Paystack approached developer experience as a growth lever — from API design decisions to documentation strategy. Covers the product thinking behind their checkout flow, how they balanced simplicity with flexibility, and what the team learned from early merchant onboarding.',
    ARRAY['Fintech', 'Developer Experience', 'Growth', 'Africa'],
    'published',
    now()
  ),
  (
    'Flutterwave''s Expansion Playbook: Building for Multiple Markets at Once',
    'Flutterwave',
    'How Flutterwave navigated the complexity of building a payments infrastructure product across 34 African countries simultaneously — regulatory fragmentation, currency handling, and the product decisions that made cross-border payments possible at scale.',
    ARRAY['Fintech', 'Expansion', 'Infrastructure', 'Africa'],
    'published',
    now() - interval '3 days'
  )
  RETURNING id, title
)
INSERT INTO public.case_library_files (entry_id, file_url, file_label, file_type)
SELECT
  e.id,
  f.file_url,
  f.file_label,
  f.file_type
FROM entries e
CROSS JOIN LATERAL (
  SELECT * FROM (VALUES
    ('placeholder://full-teardown.pdf',   'Full Teardown',     'pdf'),
    ('placeholder://slides.pdf',          'Slides',            'pdf'),
    ('placeholder://interview-notes.pdf', 'Interview Notes',   'pdf')
  ) AS t(file_url, file_label, file_type)
) f
WHERE e.title LIKE 'How Paystack%'

UNION ALL

SELECT
  e.id,
  f.file_url,
  f.file_label,
  f.file_type
FROM entries e
CROSS JOIN LATERAL (
  SELECT * FROM (VALUES
    ('placeholder://expansion-teardown.pdf', 'Full Teardown',    'pdf'),
    ('placeholder://market-map.pdf',         'Market Map',       'pdf')
  ) AS t(file_url, file_label, file_type)
) f
WHERE e.title LIKE 'Flutterwave%';
