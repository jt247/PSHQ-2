-- ============================================================
-- Migration 004: Seed content — 6 items across all four types
-- ============================================================
-- Run AFTER migrations 001-003. Idempotent (ON CONFLICT DO NOTHING).
-- author_id is left null so the items don't depend on a specific user row.
-- ============================================================

INSERT INTO public.content
  (id, title, slug, type, status, summary, body, tags, pricing_type, price_amount, currency, view_count, published_at)
VALUES

-- 1. Article (free, published)
(
  '11111111-0000-0000-0000-000000000001',
  'The 5 Stages of a Great Product Discovery',
  'the-5-stages-of-a-great-product-discovery',
  'article',
  'published',
  'Most teams skip discovery entirely or rush it. Here is how the best product teams slow down to speed up.',
  '## Why discovery matters

Product teams that invest in structured discovery ship features users actually want. The five stages are:

1. **Framing** — define the problem space, not the solution.
2. **Assumption mapping** — list every belief your team is treating as fact.
3. **Research design** — choose the lightest method that will invalidate your riskiest assumption.
4. **Testing** — run the experiment, resist tweaking the script mid-session.
5. **Synthesis** — convert raw observations into product decisions.

Discovery is not a phase. It is a muscle you build over time.

## The most common mistake

Teams jump to assumption 5 before testing assumptions 1–4. The result is a beautifully executed solution to the wrong problem.

## Recommended cadence

One discovery sprint per quarter at minimum. Weekly for early-stage teams.

## Further reading

- Continuous Discovery Habits — Teresa Torres
- The Mom Test — Rob Fitzpatrick',
  ARRAY['discovery', 'product management', 'user research'],
  'free',
  NULL,
  'NGN',
  312,
  now() - interval '14 days'
),

-- 2. Article (free, published)
(
  '11111111-0000-0000-0000-000000000002',
  'Writing a PRD That Engineers Actually Read',
  'writing-a-prd-engineers-actually-read',
  'article',
  'published',
  'Most PRDs are ignored because they are too long, too vague, or too late. Here is a leaner format that works.',
  '## The problem with traditional PRDs

A 30-page PRD written after a decision is made is documentation, not direction.

## The one-page PRD format

**Problem** (2–3 sentences): What are we solving and for whom?
**Success metric**: One number that tells us we shipped the right thing.
**Non-goals**: What are we explicitly NOT doing?
**Solution sketch**: One paragraph, no wireframes.
**Open questions**: What do we still not know?

## How to write it

Write the PRD before you know the solution. Bring it to engineering in the problem-definition phase, not the spec-complete phase.

## Template

Available in the PSHQ template library.',
  ARRAY['prd', 'documentation', 'engineering collaboration'],
  'free',
  NULL,
  'NGN',
  198,
  now() - interval '7 days'
),

-- 3. Ebook (paid, published)
(
  '11111111-0000-0000-0000-000000000003',
  'Product-Led Growth: The African Playbook',
  'product-led-growth-african-playbook',
  'ebook',
  'published',
  'A 60-page guide to implementing product-led growth strategies adapted for African markets — freemium, virality, and retention loops that actually work here.',
  NULL,
  ARRAY['plg', 'growth', 'africa', 'strategy'],
  'paid',
  500000,
  'NGN',
  89,
  now() - interval '21 days'
),

-- 4. Template (free, published)
(
  '11111111-0000-0000-0000-000000000004',
  'Product Roadmap Template (Notion + Figma)',
  'product-roadmap-template-notion-figma',
  'template',
  'published',
  'A ready-to-use roadmap template with Now/Next/Later columns, confidence ratings, and stakeholder view presets. Available in Notion and Figma.',
  NULL,
  ARRAY['roadmap', 'template', 'notion', 'figma', 'planning'],
  'free',
  NULL,
  'NGN',
  556,
  now() - interval '30 days'
),

-- 5. Template (paid, published)
(
  '11111111-0000-0000-0000-000000000005',
  'Sprint Planning & Retrospective Pack',
  'sprint-planning-retrospective-pack',
  'template',
  'published',
  'Six templates covering sprint planning, mid-sprint check-ins, retrospectives, and async standup formats. Proven across 40+ product teams.',
  NULL,
  ARRAY['sprint', 'agile', 'retrospective', 'template'],
  'paid',
  250000,
  'NGN',
  143,
  now() - interval '10 days'
),

-- 6. Course (paid, draft)
(
  '11111111-0000-0000-0000-000000000006',
  'From IC to Product Lead: Your First 90 Days',
  'from-ic-to-product-lead-first-90-days',
  'course',
  'draft',
  'A self-paced 6-module course for senior PMs stepping into leadership for the first time. Covers team dynamics, stakeholder management, and building your product operating model.',
  NULL,
  ARRAY['leadership', 'career', 'management', 'course'],
  'paid',
  1500000,
  'NGN',
  0,
  NULL
)

ON CONFLICT (slug) DO NOTHING;
