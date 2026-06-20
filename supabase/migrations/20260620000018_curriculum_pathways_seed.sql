-- Migration 018: Seed Open PM Curriculum pathways

INSERT INTO public.curriculum_pathways
  (slug, title, description, status, display_order)
VALUES
  (
    'general-pm',
    'General PM',
    'The foundational starting point for anyone new to product management.',
    'coming_soon',
    1
  ),
  (
    'ai-pm',
    'AI PM',
    'Building with AI, integrating LLMs into real products, and thinking AI-native from day one.',
    'coming_soon',
    2
  ),
  (
    'growth-pm',
    'Growth PM',
    'Growth loops, go-to-market, and the overlap between product and marketing.',
    'coming_soon',
    3
  ),
  (
    'technical-pm',
    'Technical PM',
    'Deep technical fluency, working at the edge of engineering, understanding systems at a builder''s level.',
    'coming_soon',
    4
  ),
  (
    'strategic-pm',
    'Strategic PM',
    'Business, technology, and operations fluency. Less hands-on-keyboard, more org-level thinking and leadership.',
    'coming_soon',
    5
  ),
  (
    'the-pm-architect',
    'The PM Architect',
    'The rare combination: growth, technical depth, AI, infrastructure, technical leadership, and a founder''s instinct, operating like a one-person product organization.',
    'coming_soon',
    6
  );
