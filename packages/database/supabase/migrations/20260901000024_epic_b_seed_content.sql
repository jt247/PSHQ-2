-- ----------------------------------------------------------
-- Epic B: seed Build Notes, tag existing content, seed Learning Paths,
-- Collections, Series, Exercises.
--
-- Safe to use 'guide'/'build_note' here — added in the prior migration
-- file, so they're outside this transaction per Postgres's enum rule.
--
-- All 12 existing content rows (6 articles, 3 ebooks, 3 templates) keep
-- their id/slug/type exactly as-is — this file only adds metadata and
-- join-table rows against them, never rewrites the rows themselves.
-- ----------------------------------------------------------

-- ── Backfill domain/level/resource_intent on existing content ──────────
-- Best-fit classification from an editorial read of each piece — anything
-- that didn't map cleanly stays null rather than guessed, per spec.
update public.content set domain = 'ai',      level = 'intermediate', resource_intent = array['Learn','Build']    where slug = 'why-ai-assisted-development-beats-pure-prompt-to-app-tools';
update public.content set domain = 'ai',      level = 'intermediate', resource_intent = array['Learn','Evaluate'] where slug = 'my-ai-coding-stack-ranked-by-six-months-of-actually-building-with-it';
update public.content set domain = 'building', level = 'intermediate', resource_intent = array['Build','Plan']    where slug = 'the-unsexy-part-of-vibe-coding-that-decides-if-it-survives';
update public.content set domain = 'building', level = 'beginner',    resource_intent = array['Learn','Evaluate'] where slug = 'what-i-actually-built-and-what-broke';
update public.content set domain = 'product',  level = 'beginner',    resource_intent = array['Learn','Plan']     where slug = 'stop-copying-app-store-screenshots';
update public.content set domain = 'product',  level = 'beginner',    resource_intent = array['Learn','Plan']     where slug = 'the-one-customer-problem-framework';
update public.content set domain = 'building', level = 'intermediate', resource_intent = array['Build']           where slug = 'the-vibe-coders-architecture-playbook';
update public.content set domain = 'product',  level = 'beginner',    resource_intent = array['Build','Plan']     where slug = 'from-one-customer-to-shipped-product';
update public.content set domain = 'ai',       level = 'beginner',    resource_intent = array['Evaluate','Plan']  where slug = 'choosing-your-ai-development-stack';
update public.content set domain = 'product',  level = 'beginner',    resource_intent = array['Plan','Build']     where slug = 'the-ocp-spark-builders-canvas';
update public.content set domain = 'building', level = 'beginner',    resource_intent = array['Build']            where slug = 'the-solo-builders-claude-code-setup-guide';
update public.content set domain = 'building', level = 'beginner',    resource_intent = array['Build']            where slug = 'the-ai-project-folder-structure-template';

-- ── Content ↔ Topics backfill (best-fit, not guessed beyond a reasonable read) ──
insert into public.content_topics (content_id, topic_id)
select c.id, t.id from public.content c join public.topics t on t.name = 'AI Engineering'      where c.slug in ('why-ai-assisted-development-beats-pure-prompt-to-app-tools','my-ai-coding-stack-ranked-by-six-months-of-actually-building-with-it','choosing-your-ai-development-stack')
union all
select c.id, t.id from public.content c join public.topics t on t.name = 'Startup Building'    where c.slug in ('the-unsexy-part-of-vibe-coding-that-decides-if-it-survives','what-i-actually-built-and-what-broke','the-vibe-coders-architecture-playbook')
union all
select c.id, t.id from public.content c join public.topics t on t.name = 'Product Strategy'    where c.slug in ('stop-copying-app-store-screenshots','the-one-customer-problem-framework','the-ocp-spark-builders-canvas')
union all
select c.id, t.id from public.content c join public.topics t on t.name = 'Product Discovery'   where c.slug in ('from-one-customer-to-shipped-product','the-one-customer-problem-framework')
union all
select c.id, t.id from public.content c join public.topics t on t.name = 'Software Engineering' where c.slug in ('the-solo-builders-claude-code-setup-guide','the-ai-project-folder-structure-template')
on conflict do nothing;


-- ============================================================
-- Build Notes (Step 7) — content type 'build_note'. JT does not want the
-- "Field Notes" name anywhere; this is a fresh build under Build Notes.
-- Full copy from CONTENT-SEED-PACK.md, seeded verbatim, no placeholder text.
-- ============================================================
insert into public.content (title, slug, type, status, summary, body, tags, pricing_type, source, domain, level, resource_intent, published_at)
values
(
  'What Broke When I Rebuilt Three Products With AI',
  'what-broke-when-i-rebuilt-three-products-with-ai',
  'build_note',
  'published',
  'A first-hand account of the exact failure pattern AI-assisted building creates when speed outruns architecture — and what it actually looks like when a fix in one place starts breaking two unrelated things.',
  $bn1$There is a specific kind of failure that only shows up when you are moving fast with AI tools, and I hit it during my Lovable era, rebuilding three different products back to back.

Nothing was wrong on day one. The first few features came together fast, faster than I was used to. Prompt, generate, ship, repeat. But past the impressive demo stage, the backend started getting heavy. Not slow heavy. Tangled heavy. The logic under each new feature was not sitting next to clean, isolated pieces anymore. It was reaching into things I had built two features ago, sometimes without either of us, me or the AI, fully tracking that it had happened.

By the time I noticed, it was not one thing breaking. It was one thing breaking, and then two more things breaking because I fixed the first one. Fix the payment flow, the onboarding state goes wrong. Fix onboarding, a completely unrelated report stops generating. Nothing about those three things should have been connected. But they were, because the architecture underneath had turned into a pile of implicit dependencies instead of a system with boundaries.

I have since seen the exact same pattern from the other side, on a project I am working on now, watching a developer fix one bug and two others pop up somewhere else. I could tell immediately what was happening, because I have been there. That is not bad luck and it is not a bad developer. It is a signal. When a fix in one place reliably breaks something unrelated, the problem was never really the bug. The bug was just the first crack to show. The real problem is the system has no boundaries left, and every fix is now a blind edit into a web you cannot fully see.

Here is what I take from it now. AI assisted building removes friction on writing code, but it does nothing for you architecturally unless you are deliberately keeping structure, clear modules, clear ownership of state, clear boundaries between features, as you go. Speed without structure does not fail slowly. It fails all at once, later, expensively, and it looks like chaos even though the actual cause was a series of small, individually reasonable shortcuts.

If you are building fast with AI right now and things feel like they are getting heavy, trust that feeling. It is not you being slow. It is the system telling you it is time to stop and draw some boundaries before you keep going.$bn1$,
  array['AI','Building','Architecture'],
  'free',
  'platform',
  'ai',
  'intermediate',
  array['Learn','Build'],
  now() - interval '2 days'
),
(
  'What Staging QA Actually Taught Me About Product Delivery',
  'what-staging-qa-actually-taught-me-about-product-delivery',
  'build_note',
  'published',
  'Why a full week of living inside staging before anything ships changed how I decide whether a feature is actually ready, not just whether it compiles.',
  $bn2$For a long time I treated staging like a formality, something you technically should have, but that mostly slowed things down when you were trying to ship. I do not think that anymore.

What changed it for me was simple. I started actually living in staging for about a week before anything went to production. Not a quick click through. A real week of using the product the way a real user would: different paths, different edge cases, coming back to it at different times, trying to break my own assumptions about how people would move through it.

That one week routinely surfaces the kind of bugs that would have been genuinely embarrassing in front of actual users. The silly ones. The ones that make you wince, not because they are hard to fix but because they are obvious once someone else hits them. The stuff that never shows up when you are the one who built it and already knows exactly how to use it correctly.

The bigger shift was not technical though. It was in how I made decisions. Staging QA is not just checking whether something works. It is where I actually decide whether something is beta ready or not. Watching a feature hold up under a week of real usage patterns tells me something a code review never will: whether I am confident enough to put my name on this in front of people I do not control the experience for. That is a different question than whether it compiles, and it is the one that actually matters before you expose yourself to the public with something half finished.

I think about it now as risk management for my own credibility. Every bug a user finds in production costs more than the bug itself. It costs a little of their trust, and it costs me the discomfort of having shipped something I had not actually tested. A week in staging is cheap compared to that. It has turned into one of the few non negotiables in how I build: nothing goes to real users without first surviving a real week of me trying to break it.$bn2$,
  array['Product','Building','QA'],
  'free',
  'platform',
  'product',
  'intermediate',
  array['Learn','Practice'],
  now() - interval '1 day'
),
(
  'Why My AI Product Stack Keeps Changing',
  'why-my-ai-product-stack-keeps-changing',
  'build_note',
  'published',
  'The real reason behind switching AI build tools so often — a hybrid, redundant stack across three providers plus a local fallback, and the lesson that made it non-negotiable.',
  $bn3$People sometimes ask why I seem to switch AI build tools so often. It is not indecision. It is that the tooling is moving fast enough that standing still is its own risk.

My own path through it: I started with Google AI Studio and the Google AI suite. Moved to Claude Code. Then went through a real stretch of trying almost everything: Windsurf, a long run with Lovable, Replit, Bolt, Emergent, Base44, Adalo. Each one taught me something about what a good AI build workflow actually needs, usually by being missing exactly one thing I only noticed once I hit it. Eventually I came back and settled on Claude Code as the core of how I build.

But settling did not mean picking a single tool. What I actually run today is a hybrid setup across three stacks, not one: a Claude Code stack, a Codex stack, and an OpenCode stack, with a local fallback in place, Ollama, for when I need something that does not depend on any of the hosted services being up.

The reasoning is simple once you have been burned by relying on a single tool. Different stacks are strong in different places, pricing and rate limits change without warning, and a fallback that does not depend on anyone else's infrastructure is the difference between losing an afternoon and losing nothing. It is the same instinct as staging QA honestly: build in the redundancy before you need it, not after.

So the stack keeps changing because I keep learning where each tool's edges are, and because the tools themselves keep shipping meaningful changes every few months. I do not think that is going to slow down soon, and I have stopped treating it as a problem to solve. It is just the current cost of building at the edge of what these tools can do, and having a hybrid setup with a real fallback is how I stopped feeling that cost every time one part of the stack has a bad day.$bn3$,
  array['AI','Product','Tools'],
  'free',
  'platform',
  'ai',
  'intermediate',
  array['Learn','Evaluate'],
  now()
);


-- ============================================================
-- Learning Paths (Step 4) — priority 3, modules mapped to real,
-- already-migrated content. The remaining 7 from §24 exist as draft stubs
-- (title/slug/description only, status='draft' so they never render
-- publicly) so the architecture supports all 10 without publishing empty
-- ones — nothing draft-status shows up on /learning-paths.
-- ============================================================
insert into public.learning_paths (slug, title, description, target_audience, level, estimated_time_minutes, outcomes, prerequisites, status, display_order)
values
(
  'product-management-fundamentals',
  'Product Management Fundamentals',
  'The foundational path for anyone starting in product: how to frame a problem, validate it with one real customer, and turn that into something you can actually ship.',
  'New and early-career PMs, founders, and career switchers moving into product.',
  'beginner',
  75,
  array['Frame a product problem using the One-Customer-Problem framework','Move from a single validated customer to a real, structured product','Use a repeatable canvas to plan your next bet'],
  array[]::text[],
  'published',
  1
),
(
  'become-an-ai-product-manager',
  'Become an AI Product Manager',
  'What it actually takes to manage product where AI is core to the build, not a bolt-on — from picking a defensible AI stack to knowing how AI-assisted development changes what a PM needs to evaluate.',
  'PMs and career switchers moving into AI-native product roles.',
  'intermediate',
  70,
  array['Evaluate and choose an AI development stack with real tradeoffs in mind','Understand why AI-assisted development inside a real codebase beats pure prompt-to-app tools','Read your own AI coding stack the way a PM should: what it enables and what it risks'],
  array['Basic familiarity with product management concepts'],
  'published',
  2
),
(
  'build-your-first-product-with-ai',
  'Build Your First Product With AI',
  'A hands-on path from first prompt to a real, structured product — architecture, project structure, and the failure patterns to watch for before they cost you a rebuild.',
  'Builders and founders shipping their first AI-assisted product.',
  'beginner',
  95,
  array['Set up a real project structure before you start prompting','Recognize the exact failure pattern that shows up when speed outruns architecture','Ship a first version and know what actually broke, and why'],
  array[]::text[],
  'published',
  3
),
-- Remaining 7 — architecture only, draft, not visible until real content exists
('become-a-technical-product-manager', 'Become a Technical Product Manager', 'Deep technical fluency for PMs working at the edge of engineering.', 'PMs wanting technical depth.', null, null, array[]::text[], array[]::text[], 'draft', 4),
('startup-gtm', 'Startup GTM', 'Go-to-market fundamentals for early-stage founders and PMs.', 'Founders and growth-minded PMs.', null, null, array[]::text[], array[]::text[], 'draft', 5),
('product-leadership', 'Product Leadership', 'Leading product orgs, teams, and stakeholders.', 'Senior PMs moving into leadership.', null, null, array[]::text[], array[]::text[], 'draft', 6),
('break-into-product', 'Break Into Product', 'A structured path for career switchers breaking into their first PM role.', 'Career switchers.', null, null, array[]::text[], array[]::text[], 'draft', 7),
('ai-native-software-engineering', 'AI-Native Software Engineering', 'Engineering practices built around AI-assisted development from day one.', 'Engineers and technical builders.', null, null, array[]::text[], array[]::text[], 'draft', 8),
('product-marketing', 'Product Marketing', 'Positioning, messaging, and launch for product marketers.', 'Product marketers.', null, null, array[]::text[], array[]::text[], 'draft', 9),
('founder-0-to-1', 'Founder 0→1', 'Taking a product from nothing to a first real version as a founder.', 'Founders.', null, null, array[]::text[], array[]::text[], 'draft', 10);

insert into public.learning_path_modules (learning_path_id, content_id, title, description, is_required, sequence)
select lp.id, c.id, c.title, c.summary, true, m.seq
from public.learning_paths lp
join (values
  ('product-management-fundamentals', 'the-one-customer-problem-framework', 1),
  ('product-management-fundamentals', 'from-one-customer-to-shipped-product', 2),
  ('product-management-fundamentals', 'the-ocp-spark-builders-canvas', 3),
  ('become-an-ai-product-manager', 'why-ai-assisted-development-beats-pure-prompt-to-app-tools', 1),
  ('become-an-ai-product-manager', 'choosing-your-ai-development-stack', 2),
  ('become-an-ai-product-manager', 'my-ai-coding-stack-ranked-by-six-months-of-actually-building-with-it', 3),
  ('build-your-first-product-with-ai', 'the-ai-project-folder-structure-template', 1),
  ('build-your-first-product-with-ai', 'the-solo-builders-claude-code-setup-guide', 2),
  ('build-your-first-product-with-ai', 'the-vibe-coders-architecture-playbook', 3),
  ('build-your-first-product-with-ai', 'the-unsexy-part-of-vibe-coding-that-decides-if-it-survives', 4),
  ('build-your-first-product-with-ai', 'what-i-actually-built-and-what-broke', 5)
) as m(path_slug, content_slug, seq) on m.path_slug = lp.slug
join public.content c on c.slug = m.content_slug;

insert into public.learning_path_goals (learning_path_id, goal_id)
select lp.id, g.id from public.learning_paths lp join public.goals g on g.name = 'Break into product' where lp.slug = 'product-management-fundamentals'
union all
select lp.id, g.id from public.learning_paths lp join public.goals g on g.name = 'Become an AI Product Manager' where lp.slug = 'become-an-ai-product-manager'
union all
select lp.id, g.id from public.learning_paths lp join public.goals g on g.name = 'Build with AI' where lp.slug = 'build-your-first-product-with-ai';


-- ============================================================
-- Collections (Step 5) — exactly 3, all real content, all published.
-- ============================================================
insert into public.collections (slug, title, description, status, display_order) values
('gtm-starter-pack', 'GTM Starter Pack', 'The pieces that matter most before you take anything to market: problem framing, positioning, and what it actually looks like to ship past a single customer.', 'published', 1),
('ai-builder-stack', 'AI Builder Stack', 'What to actually run when you''re building with AI — stack choices, architecture thinking, and the coding setup that keeps it fast without falling apart.', 'published', 2),
('pm-interview-starter-kit', 'PM Interview Starter Kit', 'The frameworks and canvases worth knowing cold before a PM interview or your first 90 days in the seat.', 'published', 3);

insert into public.collection_items (collection_id, content_id, display_order)
select col.id, c.id, m.seq
from public.collections col
join (values
  ('gtm-starter-pack', 'the-one-customer-problem-framework', 1),
  ('gtm-starter-pack', 'stop-copying-app-store-screenshots', 2),
  ('gtm-starter-pack', 'what-i-actually-built-and-what-broke', 3),
  ('ai-builder-stack', 'choosing-your-ai-development-stack', 1),
  ('ai-builder-stack', 'my-ai-coding-stack-ranked-by-six-months-of-actually-building-with-it', 2),
  ('ai-builder-stack', 'the-vibe-coders-architecture-playbook', 3),
  ('pm-interview-starter-kit', 'the-one-customer-problem-framework', 1),
  ('pm-interview-starter-kit', 'the-ocp-spark-builders-canvas', 2),
  ('pm-interview-starter-kit', 'from-one-customer-to-shipped-product', 3)
) as m(col_slug, content_slug, seq) on m.col_slug = col.slug
join public.content c on c.slug = m.content_slug;


-- ============================================================
-- Content Series (Step 8) — exactly 3, real sequenced content.
-- ============================================================
insert into public.series (slug, title, description, status, display_order) values
('product-strategy-101', 'Product Strategy 101', 'A sequence for framing a product problem, giving it structure, and turning it into a canvas you can actually work from.', 'published', 1),
('ai-builder-diaries', 'AI Builder Diaries', 'A running account of building with AI tools in a real codebase — what to choose, what to run, and what it looks like once you''ve been at it for months.', 'published', 2),
('building-in-africa', 'Building in Africa', 'Real, first-hand accounts of what shipping and iterating on products actually looks like in practice, warts included.', 'published', 3);

insert into public.series_items (series_id, content_id, sequence)
select s.id, c.id, m.seq
from public.series s
join (values
  ('product-strategy-101', 'the-one-customer-problem-framework', 1),
  ('product-strategy-101', 'the-ocp-spark-builders-canvas', 2),
  ('product-strategy-101', 'from-one-customer-to-shipped-product', 3),
  ('ai-builder-diaries', 'why-ai-assisted-development-beats-pure-prompt-to-app-tools', 1),
  ('ai-builder-diaries', 'my-ai-coding-stack-ranked-by-six-months-of-actually-building-with-it', 2),
  ('ai-builder-diaries', 'choosing-your-ai-development-stack', 3),
  ('ai-builder-diaries', 'the-vibe-coders-architecture-playbook', 4),
  ('building-in-africa', 'what-i-actually-built-and-what-broke', 1),
  ('building-in-africa', 'the-unsexy-part-of-vibe-coding-that-decides-if-it-survives', 2),
  ('building-in-africa', 'stop-copying-app-store-screenshots', 3)
) as m(series_slug, content_slug, seq) on m.series_slug = s.slug
join public.content c on c.slug = m.content_slug;

-- Update the series_id back-reference on content rows for the primary
-- series each piece belongs to (a piece can appear in a series without
-- this being its "home" series — series_items is the source of truth for
-- membership; this column is just a fast single-series lookup where one
-- clearly applies).
update public.content set series_id = (select id from public.series where slug = 'product-strategy-101')
  where slug in ('the-one-customer-problem-framework', 'the-ocp-spark-builders-canvas', 'from-one-customer-to-shipped-product');
update public.content set series_id = (select id from public.series where slug = 'ai-builder-diaries')
  where slug in ('why-ai-assisted-development-beats-pure-prompt-to-app-tools', 'my-ai-coding-stack-ranked-by-six-months-of-actually-building-with-it', 'choosing-your-ai-development-stack', 'the-vibe-coders-architecture-playbook');
update public.content set series_id = (select id from public.series where slug = 'building-in-africa')
  where slug in ('what-i-actually-built-and-what-broke', 'the-unsexy-part-of-vibe-coding-that-decides-if-it-survives', 'stop-copying-app-store-screenshots');


-- ============================================================
-- Content Exercises (Step 9) — exactly 3, attached to real articles.
-- ============================================================
insert into public.exercises (content_id, type, prompt, sequence)
select c.id, 'text_response', 'Write your product''s primary outcome for the next quarter.', 1
from public.content c where c.slug = 'the-one-customer-problem-framework';

insert into public.exercises (content_id, type, prompt, sequence)
select c.id, 'text_response', 'Define one North Star Metric for your product.', 1
from public.content c where c.slug = 'what-i-actually-built-and-what-broke';

insert into public.exercises (content_id, type, prompt, sequence)
select c.id, 'text_response', 'Write a problem statement for one user segment.', 1
from public.content c where c.slug = 'stop-copying-app-store-screenshots';
