-- ----------------------------------------------------------
-- Epic B follow-up: close the metadata population gap flagged in the
-- Step 1-12 sweep. resource_category, estimated_time_minutes, SEO
-- override fields, content_roles, and content_goals existed as columns/
-- tables from migration 023 but had zero rows populated. This backfills
-- all 15 published content items (12 pre-existing + 3 Build Notes).
--
-- Additive only — no id/slug/type changes, nothing here can break a live
-- URL. seo_title/seo_description are set to title/summary (the same
-- values pages already compute at render time) so the override columns
-- are ready for a future admin edit without changing current behavior.
-- canonical_url matches each item's real, already-live route.
-- ----------------------------------------------------------

update public.content set
  resource_category = 'Insight Article', estimated_time_minutes = 10,
  seo_title = title, seo_description = summary,
  canonical_url = '/articles/' || slug, og_image_url = cover_image_url
where slug = 'why-ai-assisted-development-beats-pure-prompt-to-app-tools';

update public.content set
  resource_category = 'Insight Article', estimated_time_minutes = 10,
  seo_title = title, seo_description = summary,
  canonical_url = '/articles/' || slug, og_image_url = cover_image_url
where slug = 'my-ai-coding-stack-ranked-by-six-months-of-actually-building-with-it';

update public.content set
  resource_category = 'Insight Article', estimated_time_minutes = 9,
  seo_title = title, seo_description = summary,
  canonical_url = '/articles/' || slug, og_image_url = cover_image_url
where slug = 'the-unsexy-part-of-vibe-coding-that-decides-if-it-survives';

update public.content set
  resource_category = 'Insight Article', estimated_time_minutes = 12,
  seo_title = title, seo_description = summary,
  canonical_url = '/articles/' || slug, og_image_url = cover_image_url
where slug = 'what-i-actually-built-and-what-broke';

update public.content set
  resource_category = 'Insight Article', estimated_time_minutes = 8,
  seo_title = title, seo_description = summary,
  canonical_url = '/articles/' || slug, og_image_url = cover_image_url
where slug = 'stop-copying-app-store-screenshots';

update public.content set
  resource_category = 'Framework Article', estimated_time_minutes = 10,
  seo_title = title, seo_description = summary,
  canonical_url = '/articles/' || slug, og_image_url = cover_image_url
where slug = 'the-one-customer-problem-framework';

update public.content set
  resource_category = 'Deep-Dive Ebook', estimated_time_minutes = 35,
  seo_title = title, seo_description = summary,
  canonical_url = '/content/' || slug, og_image_url = cover_image_url
where slug = 'the-vibe-coders-architecture-playbook';

update public.content set
  resource_category = 'Deep-Dive Ebook', estimated_time_minutes = 30,
  seo_title = title, seo_description = summary,
  canonical_url = '/content/' || slug, og_image_url = cover_image_url
where slug = 'from-one-customer-to-shipped-product';

update public.content set
  resource_category = 'Deep-Dive Ebook', estimated_time_minutes = 25,
  seo_title = title, seo_description = summary,
  canonical_url = '/content/' || slug, og_image_url = cover_image_url
where slug = 'choosing-your-ai-development-stack';

update public.content set
  resource_category = 'Practical Template', estimated_time_minutes = 15,
  seo_title = title, seo_description = summary,
  canonical_url = '/content/' || slug, og_image_url = cover_image_url
where slug = 'the-ocp-spark-builders-canvas';

update public.content set
  resource_category = 'Practical Template', estimated_time_minutes = 12,
  seo_title = title, seo_description = summary,
  canonical_url = '/content/' || slug, og_image_url = cover_image_url
where slug = 'the-solo-builders-claude-code-setup-guide';

update public.content set
  resource_category = 'Practical Template', estimated_time_minutes = 8,
  seo_title = title, seo_description = summary,
  canonical_url = '/content/' || slug, og_image_url = cover_image_url
where slug = 'the-ai-project-folder-structure-template';

update public.content set
  resource_category = 'Practitioner Story', estimated_time_minutes = 6,
  seo_title = title, seo_description = summary,
  canonical_url = '/build-notes/' || slug, og_image_url = cover_image_url
where slug = 'what-broke-when-i-rebuilt-three-products-with-ai';

update public.content set
  resource_category = 'Practitioner Story', estimated_time_minutes = 6,
  seo_title = title, seo_description = summary,
  canonical_url = '/build-notes/' || slug, og_image_url = cover_image_url
where slug = 'what-staging-qa-actually-taught-me-about-product-delivery';

update public.content set
  resource_category = 'Practitioner Story', estimated_time_minutes = 5,
  seo_title = title, seo_description = summary,
  canonical_url = '/build-notes/' || slug, og_image_url = cover_image_url
where slug = 'why-my-ai-product-stack-keeps-changing';


-- ── content_roles backfill (best-fit editorial read, matches the same
-- standard used for the earlier content_topics backfill) ──────────────
insert into public.content_roles (content_id, role_id)
select c.id, r.id from public.content c join public.roles r on r.name = 'Founder' where c.slug in (
  'why-ai-assisted-development-beats-pure-prompt-to-app-tools','my-ai-coding-stack-ranked-by-six-months-of-actually-building-with-it',
  'the-unsexy-part-of-vibe-coding-that-decides-if-it-survives','what-i-actually-built-and-what-broke',
  'the-one-customer-problem-framework','the-vibe-coders-architecture-playbook','from-one-customer-to-shipped-product',
  'choosing-your-ai-development-stack','the-ocp-spark-builders-canvas','the-solo-builders-claude-code-setup-guide',
  'the-ai-project-folder-structure-template','what-broke-when-i-rebuilt-three-products-with-ai',
  'what-staging-qa-actually-taught-me-about-product-delivery','why-my-ai-product-stack-keeps-changing'
)
union all
select c.id, r.id from public.content c join public.roles r on r.name = 'Engineer' where c.slug in (
  'why-ai-assisted-development-beats-pure-prompt-to-app-tools','my-ai-coding-stack-ranked-by-six-months-of-actually-building-with-it',
  'the-unsexy-part-of-vibe-coding-that-decides-if-it-survives','the-vibe-coders-architecture-playbook',
  'choosing-your-ai-development-stack','the-solo-builders-claude-code-setup-guide','the-ai-project-folder-structure-template',
  'what-broke-when-i-rebuilt-three-products-with-ai','why-my-ai-product-stack-keeps-changing'
)
union all
select c.id, r.id from public.content c join public.roles r on r.name = 'Product Manager' where c.slug in (
  'what-i-actually-built-and-what-broke','stop-copying-app-store-screenshots','the-one-customer-problem-framework',
  'from-one-customer-to-shipped-product','the-ocp-spark-builders-canvas','what-staging-qa-actually-taught-me-about-product-delivery'
)
union all
select c.id, r.id from public.content c join public.roles r on r.name = 'Product Marketer' where c.slug in ('stop-copying-app-store-screenshots')
on conflict do nothing;

-- ── content_goals backfill ──────────────────────────────────────────
insert into public.content_goals (content_id, goal_id)
select c.id, g.id from public.content c join public.goals g on g.name = 'Build with AI' where c.slug in (
  'why-ai-assisted-development-beats-pure-prompt-to-app-tools','my-ai-coding-stack-ranked-by-six-months-of-actually-building-with-it',
  'the-unsexy-part-of-vibe-coding-that-decides-if-it-survives','the-vibe-coders-architecture-playbook',
  'choosing-your-ai-development-stack','the-solo-builders-claude-code-setup-guide','the-ai-project-folder-structure-template',
  'what-broke-when-i-rebuilt-three-products-with-ai','why-my-ai-product-stack-keeps-changing'
)
union all
select c.id, g.id from public.content c join public.goals g on g.name = 'Learn AI' where c.slug in (
  'my-ai-coding-stack-ranked-by-six-months-of-actually-building-with-it','choosing-your-ai-development-stack','why-my-ai-product-stack-keeps-changing'
)
union all
select c.id, g.id from public.content c join public.goals g on g.name = 'Become more technical' where c.slug in (
  'why-ai-assisted-development-beats-pure-prompt-to-app-tools','the-vibe-coders-architecture-playbook','the-ai-project-folder-structure-template'
)
union all
select c.id, g.id from public.content c join public.goals g on g.name = 'Improve my product craft' where c.slug in (
  'the-unsexy-part-of-vibe-coding-that-decides-if-it-survives','stop-copying-app-store-screenshots','the-one-customer-problem-framework',
  'the-ocp-spark-builders-canvas','what-broke-when-i-rebuilt-three-products-with-ai','what-staging-qa-actually-taught-me-about-product-delivery'
)
union all
select c.id, g.id from public.content c join public.goals g on g.name = 'Build a startup' where c.slug in (
  'what-i-actually-built-and-what-broke','from-one-customer-to-shipped-product','the-ocp-spark-builders-canvas'
)
union all
select c.id, g.id from public.content c join public.goals g on g.name = 'Build a software product' where c.slug in (
  'what-i-actually-built-and-what-broke','what-staging-qa-actually-taught-me-about-product-delivery'
)
union all
select c.id, g.id from public.content c join public.goals g on g.name = 'Improve GTM' where c.slug in ('stop-copying-app-store-screenshots')
union all
select c.id, g.id from public.content c join public.goals g on g.name = 'Break into product' where c.slug in (
  'the-one-customer-problem-framework','from-one-customer-to-shipped-product'
)
union all
select c.id, g.id from public.content c join public.goals g on g.name = 'Learn software engineering' where c.slug in ('the-solo-builders-claude-code-setup-guide')
on conflict do nothing;
