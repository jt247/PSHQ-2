-- Migration 016: Seed Product Lab with JT editions

INSERT INTO public.initiative_editions
  (initiative_id, edition_number, title, focus_description, status, join_method, join_instructions, stats, display_order)
SELECT
  i.id,
  v.edition_number,
  v.title,
  v.focus_description,
  v.status::public.edition_status,
  v.join_method::public.edition_join_method,
  v.join_instructions,
  v.stats::jsonb,
  v.display_order
FROM public.initiatives i
CROSS JOIN (VALUES
  (
    '1.0',
    'The One-Day Build Sprint',
    'Three tools, three labs, one day. Participants built real, live products using Lovable, Google AI Studio + Stitch + Firebase, and Claude Code + Adalo.',
    'completed',
    NULL,
    NULL,
    '{"Registered": 143, "Attended": 118, "Products Shipped": 26, "Internships Landed": 4, "Paid Freelance Builds": 2}',
    10
  ),
  (
    '2.0',
    'Advanced Lovable + Google AI Suite',
    'Advanced Lovable development and the Google AI suite — Antigravity, Stitch, and Google AI Studio.',
    'open',
    'invitation_email',
    'Email hello@productslicehq.com to apply.',
    '{}',
    20
  ),
  (
    '3.0',
    'Built for Non-Technical Builders',
    'Built for non-technical builders ready to go technical. This edition focuses on Claude Code, taught from zero.',
    'coming_soon',
    NULL,
    NULL,
    '{}',
    30
  )
) AS v(edition_number, title, focus_description, status, join_method, join_instructions, stats, display_order)
WHERE i.slug = 'product-lab-with-jt';
