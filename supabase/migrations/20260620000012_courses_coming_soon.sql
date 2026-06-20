-- Migration 012: Add is_coming_soon flag and seed placeholder courses
-- Apply this in ONE query tab (no enum additions, safe as a single transaction)

-- 1. Add is_coming_soon column
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS is_coming_soon boolean NOT NULL DEFAULT false;

-- 2. Seed the 3 placeholder courses
-- Thumbnail URLs are placeholders — will be updated after R2 upload
INSERT INTO public.content (
  title,
  slug,
  type,
  status,
  summary,
  cover_image_url,
  pricing_type,
  source,
  featured,
  is_coming_soon,
  tags,
  published_at
) VALUES
(
  'AI-Assisted Product Development: From Idea to Launch',
  'ai-assisted-product-development-from-idea-to-launch',
  'course',
  'published',
  'A practical, end-to-end playbook for shipping real products using AI as your co-builder — from validating the idea to cutting the first release.',
  'PLACEHOLDER_COURSE_AI_PRODUCT_DEV',
  'free',
  'platform',
  false,
  true,
  ARRAY['AI Development', 'Product Building', 'Strategy'],
  now() - interval '3 days'
),
(
  'Mastering Your AI Coding Stack',
  'mastering-your-ai-coding-stack',
  'course',
  'published',
  'A deep dive into the tools, workflows, and mental models that make AI-assisted coding actually work — ranked and battle-tested over six months of real builds.',
  'PLACEHOLDER_COURSE_AI_CODING_STACK',
  'free',
  'platform',
  false,
  true,
  ARRAY['AI Development', 'Tools & Stack'],
  now() - interval '2 days'
),
(
  'Architecture & Security for Vibe-Coded Products',
  'architecture-and-security-for-vibe-coded-products',
  'course',
  'published',
  'What happens after the vibe coding stops: how to think about architecture, auth, data integrity, and security for products built with AI assistance.',
  'PLACEHOLDER_COURSE_ARCHITECTURE_SECURITY',
  'free',
  'platform',
  false,
  true,
  ARRAY['Architecture', 'Security', 'AI Development'],
  now() - interval '1 day'
)
ON CONFLICT (slug) DO NOTHING;
