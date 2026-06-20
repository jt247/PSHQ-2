-- Migration 014: Seed 3 template content rows

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
  'The OCP + SPARK Builder''s Canvas',
  'the-ocp-spark-builders-canvas',
  'template',
  'published',
  'A structured canvas for product builders that combines the OCP framework with the SPARK methodology — map your opportunity, define your bets, and move from idea to traction without losing the thread.',
  'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&auto=format&fit=crop&q=80',
  'https://5ad7dab7256ae5c48dd394ffee141a52.r2.cloudflarestorage.com/pshq-2/content-files/the-ocp-spark-builders-canvas.pdf',
  'free',
  'platform',
  false,
  false,
  ARRAY['Product Building', 'Strategy'],
  now() - interval '14 days'
),
(
  'The Solo Builder''s Claude Code Setup Guide',
  'the-solo-builders-claude-code-setup-guide',
  'template',
  'published',
  'A step-by-step setup guide for solo builders using Claude Code — covering project structure, CLAUDE.md configuration, custom commands, and the workflow patterns that keep AI-assisted development fast and focused.',
  'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800&auto=format&fit=crop&q=80',
  'https://5ad7dab7256ae5c48dd394ffee141a52.r2.cloudflarestorage.com/pshq-2/content-files/the-solo-builders-claude-code-setup-guide.pdf',
  'free',
  'platform',
  false,
  false,
  ARRAY['AI Development'],
  now() - interval '10 days'
),
(
  'The AI Project Folder Structure Template',
  'the-ai-project-folder-structure-template',
  'template',
  'published',
  'A battle-tested folder structure for AI-assisted projects — organised for clarity, context efficiency, and the kind of codebase that stays navigable as your product grows.',
  'https://images.unsplash.com/photo-1544819667-9bfc1de23d4e?w=800&auto=format&fit=crop&q=80',
  'https://5ad7dab7256ae5c48dd394ffee141a52.r2.cloudflarestorage.com/pshq-2/content-files/the-ai-project-folder-structure-template.pdf',
  'free',
  'platform',
  false,
  false,
  ARRAY['Product Building', 'AI Development', 'Architecture'],
  now() - interval '7 days'
)
ON CONFLICT (slug) DO UPDATE SET
  file_url = EXCLUDED.file_url,
  is_coming_soon = EXCLUDED.is_coming_soon;
