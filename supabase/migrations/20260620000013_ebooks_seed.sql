-- Migration 013: Seed 3 ebook content rows
-- Safe single transaction — no enum changes

INSERT INTO public.content (
  title,
  slug,
  type,
  status,
  summary,
  cover_image_url,
  file_url,
  pricing_type,
  source,
  featured,
  is_coming_soon,
  tags,
  published_at
) VALUES
(
  'The Vibe Coder''s Architecture Playbook',
  'the-vibe-coders-architecture-playbook',
  'ebook',
  'published',
  'The structural thinking every AI-assisted builder needs — how to organise your codebase, manage state, and make decisions that don''t collapse under pressure.',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=80',
  'https://5ad7dab7256ae5c48dd394ffee141a52.r2.cloudflarestorage.com/pshq-2/content-files/the-vibe-coders-architecture-playbook.pdf',
  'free',
  'platform',
  true,
  false,
  ARRAY['Architecture', 'AI Development', 'Product Building'],
  now() - interval '12 days'
),
(
  'From One Customer to Shipped Product',
  'from-one-customer-to-shipped-product',
  'ebook',
  'published',
  'A practitioner''s guide to moving from a single paying customer to a product with real structure — validation loops, scope decisions, and the moments that decide whether you ship or spiral.',
  'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&auto=format&fit=crop&q=80',
  'https://5ad7dab7256ae5c48dd394ffee141a52.r2.cloudflarestorage.com/pshq-2/content-files/from-one-customer-to-shipped-product.pdf',
  'free',
  'platform',
  true,
  false,
  ARRAY['Product Building', 'Strategy', 'Shipping'],
  now() - interval '9 days'
),
(
  'Choosing Your AI Development Stack',
  'choosing-your-ai-development-stack',
  'ebook',
  'published',
  'A practical breakdown of the AI coding tools, models, and workflows worth using in 2025 — ranked by real-world usefulness, not hype.',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
  'https://5ad7dab7256ae5c48dd394ffee141a52.r2.cloudflarestorage.com/pshq-2/content-files/choosing-your-ai-development-stack.pdf',
  'free',
  'platform',
  true,
  false,
  ARRAY['AI Development', 'Tools & Stack'],
  now() - interval '6 days'
)
ON CONFLICT (slug) DO UPDATE SET
  file_url = EXCLUDED.file_url,
  featured = EXCLUDED.featured,
  is_coming_soon = EXCLUDED.is_coming_soon;
