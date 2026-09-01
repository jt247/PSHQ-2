-- ----------------------------------------------------------
-- Epic B: Case Library rebuild, Product Lab restructure, Open PM
-- Curriculum restructure — pulled forward from Epic C per JT's explicit
-- instruction (Build Prompt 3, Steps 6/11/12).
--
-- Per JT's direct decision on the Step 0 discovery conflicts:
--  1. Case library: the 2 existing placeholder-file entries (Paystack,
--     Flutterwave) are removed outright and replaced with OPay/PiggyVest/
--     Grey under the same table, extended with the full case model.
--  2. Product Lab: keep the existing initiatives/initiative_editions
--     tables (don't introduce a parallel ProductLabEdition table) and
--     extend initiative_editions with the fields the new page needs.
--     Edition 1.0 completed, Edition 2.0 completed, Edition 3.0 coming
--     soon — every edition gets its own detail page.
--  3. Curriculum: keep the existing 6-pathway structure. The 9-module
--     scaffold becomes the content of the 'general-pm' pathway. The other
--     5 pathways stay coming_soon (JT is supplying their real content
--     separately — see SIDENOTES.md) but their pages must still render,
--     never empty or 404.
-- ----------------------------------------------------------


-- ============================================================
-- CASE LIBRARY
-- ============================================================

-- Remove the 2 existing placeholder-file cases outright, per JT — cascade
-- takes their files and any interactions with them.
delete from public.case_library_entries
where company_name in ('Paystack', 'Flutterwave');

alter table public.case_library_entries
  add column if not exists slug                  text,
  add column if not exists logo_url               text,
  add column if not exists industry               text,
  add column if not exists market                 text,
  add column if not exists country                text,
  add column if not exists stage                  text,
  add column if not exists product                text,
  add column if not exists problem                text,
  add column if not exists target_customer        text,
  add column if not exists market_context          text,
  add column if not exists business_model          text,
  add column if not exists product_strategy        text,
  add column if not exists acquisition             text,
  add column if not exists activation              text,
  add column if not exists retention               text,
  add column if not exists revenue                 text,
  add column if not exists distribution            text,
  add column if not exists competitive_advantage    text,
  add column if not exists key_product_decisions    text,
  add column if not exists what_worked              text,
  add column if not exists what_did_not_work        text,
  add column if not exists challenges              text,
  add column if not exists jt_analysis              text,
  add column if not exists what_i_would_do_differently text,
  add column if not exists key_lessons              text[] not null default '{}',
  add column if not exists discussion_questions     text[] not null default '{}',
  add column if not exists sources                 jsonb not null default '[]';

create unique index if not exists case_library_entries_slug_idx on public.case_library_entries (slug) where slug is not null;

insert into public.case_library_entries (
  title, company_name, slug, description, tags, status, published_at,
  logo_url, industry, market, country, stage, product, problem, target_customer,
  market_context, business_model, product_strategy, acquisition, activation, retention,
  revenue, distribution, competitive_advantage, key_product_decisions, what_worked,
  what_did_not_work, challenges, jt_analysis, what_i_would_do_differently,
  key_lessons, discussion_questions, sources
) values
(
  'OPay: Betting on Physical Infrastructure to Win Digital Trust',
  'OPay',
  'opay',
  'How OPay used a massive physical agent network, not app polish, to solve financial inclusion for Nigeria''s unbanked — and what that same distribution model exposed about governance at scale.',
  array['Fintech', 'Africa', 'Distribution', 'Agent Banking'],
  'published',
  now(),
  null, -- logo not sourced during this build — flagged for JT to supply
  'Fintech: mobile money, payments, agent banking',
  'Emerging markets (Nigeria primary; also Egypt, Pakistan, Indonesia)',
  'Nigeria (HQ: Lagos)',
  'Growth stage, scaled. Africa''s fastest growing unicorn as of 2021',
  'Mobile wallet, POS/agent banking network, bill payments, lending, prepaid cards, ride hailing adjacent super app features',
  'Financial inclusion for Nigeria''s largely unbanked and underbanked population, who lack easy access to traditional banking rails',
  'Everyday Nigerians (consumer wallet users) and informal sector agents and merchants who run OPay POS terminals as a livelihood',
  'Backed by Opera, launched into a market where cash still dominates and traditional bank account penetration is low. Competes with other mobile money players and traditional banks'' digital arms',
  'Transaction fees (transfers, bill payments, POS), lending interest, merchant services. Agent network model where individual agents earn commission running OPay POS points',
  'Consumer wallet plus a massive on the ground agent network as the acquisition and cash in/cash out infrastructure. Solved the "how do you onboard people without bank accounts" problem physically, not just digitally',
  'Agent network as a distribution flywheel (agents recruit customers in their communities). Aggressive incentive driven growth funded by large capital raises',
  'First successful transfer or bill payment via wallet or through an agent',
  'Everyday utility. The wallet becomes a daily use tool for transfers, airtime, and bill payments',
  'Fees on transactions, lending products, merchant and POS services',
  'Physical agent network (POS agents in neighborhoods and markets) plus an app based digital wallet',
  'Scale of agent network plus capital backing (SoftBank led $400M round, 2021, roughly $2B valuation), plus Opera''s existing user base and infrastructure',
  'Betting heavily on physical agent infrastructure rather than purely digital acquisition, in a market where trust and cash handling still matter',
  'Agent network distribution reached users that traditional digital only fintechs could not. Reached 45M+ users and 1M+ merchants by mid 2026',
  'Regulatory friction. The Central Bank of Nigeria restricted new customer onboarding in April 2024 over KYC concerns (lifted June 2024). A 2023 court case involved agent misconduct, exposing the risk of a distribution model built on thousands of semi independent agents',
  'Balancing rapid, incentive driven growth against KYC and compliance rigor at agent network scale. Regulatory trust in a heavily scrutinized sector',
  $ja1$OPay's real bet was never the wallet. It was the agent network. In a market where trust in digital money is still being earned, physical infrastructure did something a purely digital product could not: it put a real person in front of a new user to make the first transaction feel safe. That is a distribution insight more than a product insight, and it only becomes obvious once you have tried to acquire users in a market with low digital trust. The tradeoff is that a distribution model built on thousands of semi independent agents is also a governance problem waiting to surface. The 2023 agent misconduct case and the 2024 KYC restriction were not bad luck. They were the predictable cost of scaling faster than your ability to govern the edges of your own network.$ja1$,
  'I would have invested earlier in agent level compliance tooling and monitoring, before growth made it expensive to retrofit. Regulatory trust is not something you can buy back quickly once a regulator has reason to slow you down.',
  array[
    'Physical distribution can solve a trust problem no amount of app polish can solve on its own.',
    'Every growth channel you do not fully govern becomes a liability at scale, not just a cost center.',
    'Regulatory relationships are part of the product, not a side conversation legal handles separately.'
  ],
  array[
    'Physical agent networks are expensive and hard to govern. When is that tradeoff worth it over a purely digital play?',
    'How should a fast scaling fintech balance growth incentives against KYC and compliance rigor?',
    'What does OPay''s Opera backing suggest about the role of an existing distribution asset in fintech launches?'
  ],
  '[{"label":"Opay, Wikipedia","url":"https://en.wikipedia.org/wiki/Opay"},{"label":"OPay 2026 Company Profile, PitchBook","url":"https://pitchbook.com/profiles/company/268751-35"},{"label":"How OPay is deepening financial inclusion, Guardian Nigeria","url":"https://guardian.ng/business-services/how-opay-is-deepening-financial-inclusion-creating-jobs-across-nigeria/"}]'::jsonb
),
(
  'PiggyVest: Sequencing Trust Before Complexity',
  'PiggyVest',
  'piggyvest',
  'How PiggyVest earned the right to sell riskier investment products by first proving it could keep a small, simple savings promise, one locked deposit at a time.',
  array['Fintech', 'Africa', 'Savings', 'Retention'],
  'published',
  now() - interval '2 days',
  null,
  'Fintech: savings and investment',
  'Nigeria. West Africa''s pioneering online savings and investment platform',
  'Nigeria',
  'Growth stage, profitable since 2018',
  'AutoSave, SafeLock, Target Savings, Flex Naira/Flex Dollar (savings). Jar (low risk investing), Investify (higher risk options including stocks and fixed income)',
  'Nigerians historically had weak, low trust, low yield saving habits and limited easy access to structured investment products',
  'Everyday Nigerians, especially younger, digitally native savers building a saving and investing habit for the first time',
  'Launched 2016 as PiggyBank.ng, rebranded PiggyVest in 2019. Entered a market with low formal savings culture and built trust through gamification, transparency, and low minimums',
  'Spread and margin on managed funds, fees on certain investment products. Scale driven (assets under management growth)',
  'Make saving feel achievable and even fun (gamified goals, a savings commitment device called SafeLock) before layering on more sophisticated investment products for users who graduate to them',
  'Word of mouth and community driven growth, strong brand trust, low minimum deposits (as low as ₦1,000) lowering the barrier to first use',
  'First successful automated or manual save into a savings product',
  'Recurring auto save behavior, interest payouts (7% to 35% depending on product) reinforcing the habit loop',
  'Margin on funds under management, product specific fees',
  'Direct to consumer app. No physical agent network needed, since savings and investment does not require cash in infrastructure the way mobile money does',
  'First mover trust and brand recognition in Nigerian digital savings. Founder market fit (founded by Odunayo Eweniyi, Joshua Chibueze, Somto Ifezue)',
  'Prioritizing habit building savings mechanics (AutoSave, SafeLock) ahead of investment complexity. Partnering with the Nigerian Stock Exchange (2020) to add fractional stock buying only once the savings base was established',
  'Reached 3.5M+ users by 2021 and 4.5M+ by 2023. Paid out over ₦1.1 trillion (roughly $1.42B) in savings and returns since launch, durable trust at scale',
  'Not publicly documented in detail. Worth your own read on where the model has shown strain as it scales',
  'Sustaining trust and yield promises at scale in a volatile macroeconomic (currency and inflation) environment',
  $ja2$PiggyVest sequenced the hardest problem in fintech, getting people to trust you with their money, in the right order. They did not lead with sophisticated investment products. They led with the smallest possible commitment: a locked savings habit with a low minimum and a clear payout. Trust got built one small, kept promise at a time before they asked users to take on more risk with Jar and Investify. That sequencing decision is easy to miss because from the outside it looks like a simple product, but the discipline to stay simple while competitors raced to add features is the actual strategy.$ja2$,
  'I would want to see how they are protecting real returns for users against currency and inflation pressure as the platform scales, since a savings product''s entire value proposition collapses the moment users stop trusting the yield.',
  array[
    'Sequence trust before complexity. Earn the right to offer riskier products.',
    'A low minimum deposit is not a marketing gimmick. It is a trust building mechanic.',
    'Founder credibility becomes actual product infrastructure when you are asking people to hand over money.'
  ],
  array[
    'How did gamification specifically lower the psychological barrier to saving for first time users?',
    'Why sequence savings habit first and investing second instead of launching both at once?',
    'What role does founder credibility play in a product asking people to trust it with their money?'
  ],
  '[{"label":"PiggyVest, Dealroom","url":"https://app.dealroom.co/companies/piggyvest"},{"label":"Digitalizing Saving, PiggyVest''s Journey, Silicon Africa","url":"https://siliconafrica.org/piggyvest/"},{"label":"How PiggyVest is changing Nigeria''s youth culture, CIO","url":"https://www.cio.com/article/401314/how-investment-and-savings-platform-piggyvest-is-changing-nigerias-youth-culture.html"}]'::jsonb
),
(
  'Grey: Winning by Refusing to Be a Bank for Everyone',
  'Grey (Grey Finance)',
  'grey',
  'How Grey grew to a million users on just $2M in seed funding by staying narrowly focused on one painful problem — African remote workers stuck holding foreign currency — before expanding into business banking.',
  array['Fintech', 'Cross-border Payments', 'Y Combinator', 'Capital Efficiency'],
  'published',
  now() - interval '4 days',
  null,
  'Fintech: cross border payments, multi currency accounts',
  'Digital nomads, remote workers, freelancers, and African tech professionals earning in foreign currency. Expanded to Africa, US, Europe, Latin America, Southeast Asia',
  'Founded by two Nigerians. Headquartered in Delaware, US. Licensed in Canada (FinTrac) and US (FinCEN)',
  'Seed stage, YC backed, scaling internationally',
  'Virtual foreign bank accounts (USD, GBP, EUR), instant currency conversion, international money transfers, USDC crypto payouts. Grey Business for African startups and SMEs',
  'African remote workers and businesses struggle to receive, hold, and convert foreign currency income and payments without expensive, slow, or inaccessible traditional banking rails',
  'Remote workers and freelancers paid in USD, GBP, or EUR, and, via Grey Business, African startups and SMEs needing global payment rails',
  'Rebranded from Aboki Africa to Grey in 2022 and joined Y Combinator''s Winter 2022 batch. Expanded into East Africa (Kenya) via a Cellulant partnership, then into Latin America and Southeast Asia by mid 2024',
  'FX spread and conversion fees, transfer fees. Business fees via Grey Business for startups and SMEs',
  'Start with the individual digital nomad and remote worker pain point (get paid in USD, hold it, convert it fairly) before expanding to a B2B global payments product',
  'Y Combinator credibility and network effects within the remote work and tech community. Word of mouth among African tech professionals',
  'First successful receipt of foreign currency payment into a Grey virtual account',
  'Ongoing use as the default account for receiving foreign income and converting or spending it',
  'FX spread and transfer fees on individual accounts. Business fees via Grey Business',
  'Fully digital, no agent network. Targets a tech savvy, already online user base',
  'Y Combinator backing and credibility. Founder market fit (built by Nigerians for the exact pain point they experienced). Early mover in the African remote worker banking niche',
  'Deliberately narrow initial ideal customer profile (digital nomads and remote workers) before broadening into business banking with Grey Business, launched 2026. Did not try to be a general purpose bank on day one',
  'Grew from 500K users (Nov 2023) to 1M+ users (Aug 2024) on just $2M in seed funding. Capital efficient growth. Successful geographic expansion beyond Africa into Latin America and Southeast Asia',
  'Not publicly documented in detail. Worth your own read on where the model has shown friction as it scales across jurisdictions',
  'Operating a multi jurisdiction compliance and licensing footprint (US, Canada, and expansion markets) as a lean, seed funded team',
  $ja3$Grey's smartest move was refusing to be a bank for everyone on day one. They picked one specific, painful, well understood problem, remote workers getting paid abroad and stuck holding foreign currency, and built for exactly that person before expanding into Grey Business. That kind of restraint is hard to hold onto when funding and momentum are pushing you to expand faster, and it is exactly why capital efficient growth like theirs, roughly a million users on two million dollars, is possible. You cannot buy that kind of product market fit. You have to earn it by staying narrow long enough for the product to actually fit.$ja3$,
  'I would want more visibility into how they are managing compliance overhead as they add jurisdictions, since that is usually where lean, fast moving fintechs start slowing down without realizing it, until it shows up in support tickets and expansion delays.',
  array[
    'A narrow, well chosen first customer beats a broad, vague one, even when you eventually want to serve everyone.',
    'Y Combinator style backing can substitute for large capital if it gets you credibility with exactly the right early users.',
    'Multi jurisdiction compliance is a real product cost. Budget for it before you expand, not after.'
  ],
  array[
    'What does Grey''s narrow initial ICP teach about sequencing B2C before B2B?',
    'How did YC backing substitute for a large early funding round in driving growth?',
    'What are the hidden costs of expanding into new geographies and currencies as a small team?'
  ],
  '[{"label":"Grey (company), Wikipedia","url":"https://en.wikipedia.org/wiki/Grey_(company)"},{"label":"Grey Finance Surpasses 1 Million Users, Launch Base Africa","url":"https://launchbaseafrica.com/2024/08/12/nigerian-fintech-grey-finance-surpasses-1-million-users-fueled-by-2-million-seed-funding/"},{"label":"Grey launches Grey Business, TechCabal","url":"https://techcabal.com/2026/02/24/grey-business-launches/"},{"label":"Nigerian fintech Grey gets backing from Y Combinator, TechCrunch","url":"https://techcrunch.com/2022/02/08/nigerian-fintech-grey-finance-gets-backing-from-y-combinator/"}]'::jsonb
);


-- ============================================================
-- PRODUCT LAB — extend initiative_editions, restructure per JT: every
-- edition gets its own full detail page. Edition numbering/status per
-- JT's direct correction: 1.0 completed, 2.0 completed, 3.0 coming soon.
-- ============================================================

-- New canonical route per JT: /initiatives/product-lab (was
-- /initiatives/product-lab-with-jt — the old page now redirects here so
-- the URL keeps resolving). Updating this row's slug is what makes the
-- generic /initiatives index page automatically link to the new URL.
update public.initiatives set slug = 'product-lab' where slug = 'product-lab-with-jt';

alter table public.initiative_editions
  add column if not exists slug                text,
  add column if not exists event_date          date,
  add column if not exists long_description    text,
  add column if not exists speakers            jsonb not null default '[]',
  add column if not exists learning_objectives text[] not null default '{}',
  add column if not exists agenda              jsonb not null default '[]',
  add column if not exists recording_url       text,
  add column if not exists slides_url          text,
  add column if not exists resources           jsonb not null default '[]',
  add column if not exists images              text[] not null default '{}',
  add column if not exists related_content_ids uuid[] not null default '{}',
  add column if not exists pricing             text not null default 'free' check (pricing in ('free', 'paid')),
  add column if not exists registration_url    text,
  add column if not exists replay_url          text;

create unique index if not exists initiative_editions_slug_idx on public.initiative_editions (slug) where slug is not null;

-- Correct edition 2.0's status per JT (was seeded 'open'/invitation before
-- this restructure — JT confirms it already ran) and give every edition a
-- slug for its own detail page.
update public.initiative_editions ie
set
  slug = '1-0-one-day-build-sprint',
  long_description = 'A one-day, hands-on AI product development workshop. Participants built real, live products in a single day across three different tool stacks — Lovable, Google AI Studio with Stitch and Firebase, and Claude Code with Adalo — going from idea to a shipped, working product before the day ended.',
  learning_objectives = array[
    'Ship a working product end to end in a single day using an AI-assisted stack',
    'Compare three different AI build approaches (Lovable, Google AI suite, Claude Code) hands-on',
    'Leave with a real, live product, not a mockup or a plan'
  ],
  pricing = 'free'
from public.initiatives i
where ie.initiative_id = i.id and i.slug = 'product-lab' and ie.edition_number = '1.0';

update public.initiative_editions ie
set
  slug = '2-0-advanced-lovable-google-ai-suite',
  status = 'completed',
  long_description = 'An advanced, invitation-only session going deeper into Lovable development and the Google AI suite — Antigravity, Stitch, and Google AI Studio — for builders who had already worked with these tools and wanted to push past the basics.',
  pricing = 'free'
from public.initiatives i
where ie.initiative_id = i.id and i.slug = 'product-lab' and ie.edition_number = '2.0';

-- Edition 3.0: the existing DB row ("Built for Non-Technical Builders")
-- and the seed pack's "Product Lab 3.0" (AI Engineering and Vibecoding,
-- paid) describe two different ideas for the same slot. Per JT's directive
-- to make progress now and let him correct details later, this edition is
-- repositioned to the seed pack's paid AI Engineering/Vibecoding framing —
-- flagged in SIDENOTES.md for JT to confirm or redirect.
update public.initiative_editions ie
set
  slug = '3-0-ai-engineering-and-vibecoding',
  title = 'Product Lab 3.0',
  focus_description = 'A paid, hands-on AI Engineering and Vibecoding workshop for people who want to build real products with AI tools, taught from real practitioner experience.',
  long_description = 'Product Lab 3.0 is a paid, hands-on workshop focused on AI engineering and vibecoding — for builders who want to go beyond prompting and actually understand how to architect, ship, and maintain real products built with AI tools. Details, date, and agenda are still being finalized.',
  status = 'coming_soon',
  pricing = 'paid'
from public.initiatives i
where ie.initiative_id = i.id and i.slug = 'product-lab' and ie.edition_number = '3.0';


-- ============================================================
-- OPEN PM CURRICULUM — curriculum_modules + curriculum_lessons, seeded
-- for the 'general-pm' pathway per the 9-module scaffold. The other 5
-- pathways stay coming_soon with no modules yet (JT supplying real
-- content — see SIDENOTES.md) but their existing description keeps their
-- page from ever rendering empty.
-- ============================================================

create table public.curriculum_modules (
  id            uuid primary key default gen_random_uuid(),
  pathway_id    uuid not null references public.curriculum_pathways (id) on delete cascade,
  module_number integer not null,
  title         text not null,
  description   text,
  display_order integer not null default 0
);

create table public.curriculum_lessons (
  id            uuid primary key default gen_random_uuid(),
  module_id     uuid not null references public.curriculum_modules (id) on delete cascade,
  title         text not null,
  summary       text not null,
  display_order integer not null default 0
);

alter table public.curriculum_modules enable row level security;
alter table public.curriculum_lessons enable row level security;
create policy "curriculum_modules: public read" on public.curriculum_modules for select using (true);
create policy "curriculum_lessons: public read" on public.curriculum_lessons for select using (true);

create index on public.curriculum_modules (pathway_id, display_order);
create index on public.curriculum_lessons (module_id, display_order);

-- Module 1 — Foundations of Product Management
with m as (
  insert into public.curriculum_modules (pathway_id, module_number, title, description, display_order)
  select id, 1, 'Foundations of Product Management', 'What a PM actually does day to day, where the role sits in a company, and the core vocabulary you need before anything else makes sense.', 1
  from public.curriculum_pathways where slug = 'general-pm'
  returning id
)
insert into public.curriculum_lessons (module_id, title, summary, display_order)
select m.id, l.title, l.summary, l.seq from m, (values
  ('What a Product Manager Actually Does', 'A PM is responsible for the outcome of a product, not any single deliverable. In practice that means constantly moving between understanding user problems, deciding what to build, and making sure it actually ships and works. There is no fixed job description that holds across companies — the shape of the role changes with company stage, but the core job, deciding what matters and why, does not.', 1),
  ('The Product Life Cycle', 'Every product moves through recognizable stages: discovery, before you know if the problem is real; build, once you have enough conviction to commit engineering time; launch, when real users first touch it; and growth or decline, once the market gives its verdict. Knowing which stage you are in changes what "good work" looks like — the discipline discovery rewards (staying open, testing cheaply) actively hurts you once you are in growth mode, where focus and execution speed matter more.', 2),
  ('Core PM Vocabulary', 'Terms like North Star Metric, MVP, roadmap, backlog, and PRD get used loosely and inconsistently across companies. A North Star Metric is the single measure that best represents the value your product delivers. An MVP is the smallest version of a product that lets you test a real assumption, not a smaller version of your final vision. Getting these definitions straight early saves you from talking past engineers and designers who use the same words differently.', 3),
  ('Types of PM Roles', 'Not all PM roles are the same job. A Growth PM is judged on acquisition and retention numbers. A Platform PM builds for other engineering teams as their customer. A Technical PM needs enough engineering fluency to make architecture tradeoffs credibly. An AI PM increasingly needs to understand model behavior and evaluation, not just user behavior. Knowing which flavor of PM you are, or want to become, changes what skills are actually worth investing in first.', 4)
) as l(title, summary, seq);

-- Module 2 — Discovery and Research
with m as (
  insert into public.curriculum_modules (pathway_id, module_number, title, description, display_order)
  select id, 2, 'Discovery and Research', 'How to find out whether a problem is real and worth solving before you spend engineering time building an answer to it.', 2
  from public.curriculum_pathways where slug = 'general-pm'
  returning id
)
insert into public.curriculum_lessons (module_id, title, summary, display_order)
select m.id, l.title, l.summary, l.seq from m, (values
  ('Problem Framing', 'Most failed products did not fail because of bad execution — they failed because the team was solving a problem nobody urgently had. Problem framing means writing down, in plain language, who has the problem, when it shows up, and what they currently do about it (including doing nothing). If you cannot state the problem without mentioning your own solution, you have not actually framed it yet.', 1),
  ('User Research Methods', 'Interviews, surveys, and usage data each answer different questions. Interviews are best for understanding why, in someone''s own words, but are easy to lead with a bad question. Surveys scale but only tell you what people think they''ll do, not what they actually do. Usage data tells you what people actually did, but never why. Good discovery combines at least two of these rather than trusting one in isolation.', 2),
  ('Jobs to Be Done', 'People don''t buy products, they hire them to make progress on something. The Jobs to Be Done lens asks what "job" a user was trying to get done when they reached for your product, or a competitor''s, or a completely different category of solution entirely. This reframing is useful because it surfaces real substitutes you''d otherwise miss — a spreadsheet can be the actual competitor to your analytics tool, not another analytics tool.', 3),
  ('Validating Demand Before You Build', 'Validation means finding the cheapest possible test that could prove you wrong. That might be a landing page measuring signup intent, a manual "concierge" version of the feature done by hand before it's automated, or simply asking a handful of target users to pay before anything exists. The goal is never to prove yourself right — it's to find out fast, and cheaply, if you're wrong.', 4)
) as l(title, summary, seq);

-- Module 3 — Strategy and Vision
with m as (
  insert into public.curriculum_modules (pathway_id, module_number, title, description, display_order)
  select id, 3, 'Strategy and Vision', 'Turning a validated problem into a coherent direction the whole team can prioritize against, instead of a list of features.', 3
  from public.curriculum_pathways where slug = 'general-pm'
  returning id
)
insert into public.curriculum_lessons (module_id, title, summary, display_order)
select m.id, l.title, l.summary, l.seq from m, (values
  ('Product Vision', 'A vision describes the world your product wants to exist in a few years out, independent of any specific feature. It should be specific enough to rule things out — a vision vague enough to justify any roadmap decision is not actually doing its job. The test of a good vision is whether it helps you say no to a reasonable-sounding feature request because it doesn''t serve where you''re trying to go.', 1),
  ('Strategy Frameworks', 'Frameworks like Playing to Win (where to play, how to win) or the Product-Market Fit pyramid exist to force explicit tradeoffs rather than let strategy stay implicit. None of them are magic — their value is in the discipline of writing the answer down and testing whether your team actually agrees on it, which is often where strategy quietly falls apart.', 2),
  ('Positioning', 'Positioning is the specific claim you make about who your product is for and what it does better than the alternative, stated plainly enough that a stranger understands it in one sentence. Weak positioning tries to be for everyone; strong positioning accepts that being clearly right for a narrow group beats being vaguely relevant to a broad one.', 3),
  ('Prioritization Frameworks', 'RICE, ICE, and similar scoring frameworks exist to make competing priorities comparable on the same axis instead of an argument about whose feature "feels" more important. They work best as a forcing function for the conversation, not as a spreadsheet formula you trust blindly — the real value is in debating the inputs, not the final score.', 4)
) as l(title, summary, seq);

-- Module 4 — Execution and Delivery
with m as (
  insert into public.curriculum_modules (pathway_id, module_number, title, description, display_order)
  select id, 4, 'Execution and Delivery', 'Turning strategy into a working roadmap, and actually shipping it with engineering and design.', 4
  from public.curriculum_pathways where slug = 'general-pm'
  returning id
)
insert into public.curriculum_lessons (module_id, title, summary, display_order)
select m.id, l.title, l.summary, l.seq from m, (values
  ('Roadmapping', 'A roadmap that lists features and dates is a promise, not a strategy artifact — and it will be wrong the moment reality diverges from the plan, which is always. A roadmap organized around outcomes and themes instead of specific features gives you room to change the "how" without breaking the commitment you actually made to stakeholders.', 1),
  ('Working With Engineering and Design', 'The PM''s job in this relationship is to arrive with a clear problem and constraints, not a pre-decided solution — otherwise you''re not collaborating with engineering and design, you''re dictating to them and losing their best thinking. The best PM/eng/design relationships treat tradeoffs as a shared decision, made with full information on both sides, not a negotiation across a wall.', 2),
  ('Agile and Sprint Practices', 'Agile ceremonies (standups, sprint planning, retros) exist to surface problems early, not to perform process for its own sake. A team doing Scrum by the book but never actually adjusting based on what a retro surfaces is going through the motions. The actual point is a tight feedback loop between planning and reality.', 3),
  ('Shipping and Iteration', 'Shipping is not the finish line — it''s the point where you finally get real signal instead of a guess. Treat the first release of anything as a hypothesis test, with a plan for what you''ll look at afterward to decide whether to invest further, iterate, or kill it. Products that never get iterated on after launch usually weren''t being watched closely enough to know they needed it.', 4)
) as l(title, summary, seq);

-- Module 5 — Metrics and Analytics
with m as (
  insert into public.curriculum_modules (pathway_id, module_number, title, description, display_order)
  select id, 5, 'Metrics and Analytics', 'Defining what success actually looks like, and building the habit of letting data, not opinion, settle arguments.', 5
  from public.curriculum_pathways where slug = 'general-pm'
  returning id
)
insert into public.curriculum_lessons (module_id, title, summary, display_order)
select m.id, l.title, l.summary, l.seq from m, (values
  ('Defining Success Metrics', 'A good metric is specific enough that two people looking at the same dashboard would agree on whether it moved. Vague goals like "improve engagement" hide the fact that nobody has actually decided what engagement means numerically, which makes it impossible to know if you succeeded.', 1),
  ('North Star Metric', 'Your North Star Metric should represent the value your product delivers to users, not a vanity number that goes up regardless of whether people are genuinely benefiting. A good test: if this number goes up but users are unhappier, you picked the wrong metric.', 2),
  ('Experimentation and A/B Testing', 'A/B testing only produces trustworthy answers with enough sample size and a genuinely random split — running a test on too little traffic and reading the early results as a verdict is one of the most common ways teams fool themselves with "data."', 3),
  ('Data-Informed Decision Making', 'Data should inform judgment, not replace it — numbers tell you what happened, not always why, and not what to do next. The strongest PMs use data to challenge their own assumptions first, before using it to challenge anyone else''s.', 4)
) as l(title, summary, seq);

-- Module 6 — Go To Market and Growth
with m as (
  insert into public.curriculum_modules (pathway_id, module_number, title, description, display_order)
  select id, 6, 'Go To Market and Growth', 'Getting a product in front of the right people, and building the loops that make it keep growing after launch.', 6
  from public.curriculum_pathways where slug = 'general-pm'
  returning id
)
insert into public.curriculum_lessons (module_id, title, summary, display_order)
select m.id, l.title, l.summary, l.seq from m, (values
  ('Launch Planning', 'A launch is not a single day, it''s the coordination of positioning, channels, and internal readiness all landing at the same moment. Planning backwards from launch day, rather than treating it as whatever''s left over once building is done, is what separates a real go-to-market motion from an afterthought announcement.', 1),
  ('Acquisition', 'Acquisition channels differ enormously in cost, speed, and durability — paid ads buy speed but stop the moment budget stops, while something like an agent network or word of mouth is slower to build but compounds. The right channel depends entirely on your specific market''s trust dynamics, not a generic "best practice."', 2),
  ('Activation and Retention', 'Activation is the first moment a user experiences the real value of your product, and it''s usually much narrower and more specific than "signed up." Retention is what happens after — and it lives or dies on whether the product becomes a genuine habit, not just a one-time useful tool.', 3),
  ('Monetization Basics', 'Pricing and packaging decisions should follow from how value is actually delivered and perceived, not be bolted on after the product is built. The units you charge for should track the units of value a customer experiences — charging per seat when value scales with usage, for example, misaligns the two.', 4)
) as l(title, summary, seq);

-- Module 7 — AI and Modern Product Building
with m as (
  insert into public.curriculum_modules (pathway_id, module_number, title, description, display_order)
  select id, 7, 'AI and Modern Product Building', 'What changes about product work when AI is core to how you build and what you ship, not just a feature bolted on.', 7
  from public.curriculum_pathways where slug = 'general-pm'
  returning id
)
insert into public.curriculum_lessons (module_id, title, summary, display_order)
select m.id, l.title, l.summary, l.seq from m, (values
  ('AI-Assisted Development for PMs', 'AI-assisted development changes the PM''s job by collapsing the distance between a spec and a working prototype — a PM who can prompt a real, functioning first draft can validate ideas faster than one who can only write a document about them. That doesn''t replace engineering, but it does change how early in the process a PM can get real signal.', 1),
  ('AI Product Management Fundamentals', 'Managing an AI-powered product means managing for probabilistic, not deterministic, behavior — a feature can work correctly 95% of the time and still be a bad product if the 5% failure mode is the wrong one. Evaluation, not just a demo, is how you know if an AI feature is actually ready.', 2),
  ('Working With AI Tools as a PM', 'The AI tools worth adopting as a PM are the ones that shorten the distance between an idea and a testable version of it — for research synthesis, for drafting specs, for prototyping. The risk is trusting AI output uncritically on anything user-facing without your own judgment sitting on top of it.', 3)
) as l(title, summary, seq);

-- Module 8 — Leadership and Stakeholder Management
with m as (
  insert into public.curriculum_modules (pathway_id, module_number, title, description, display_order)
  select id, 8, 'Leadership and Stakeholder Management', 'Getting things done through people you don''t manage, and holding a room together when the plan changes.', 8
  from public.curriculum_pathways where slug = 'general-pm'
  returning id
)
insert into public.curriculum_lessons (module_id, title, summary, display_order)
select m.id, l.title, l.summary, l.seq from m, (values
  ('Influencing Without Authority', 'Most of a PM''s influence comes from being trusted to have done the homework, not from a title. Bringing evidence, having genuinely considered the counterargument, and being willing to be proven wrong builds the kind of credibility that gets your call respected the next time, even without formal authority over the people you''re asking to move.', 1),
  ('Communicating Up and Across', 'Executives need the headline and the decision being asked of them; your team needs the detail and the reasoning behind it. Sending the same message to both audiences usually under-serves one of them — knowing which altitude to communicate at is its own skill, separate from the underlying judgment.', 2),
  ('Managing Through Ambiguity', 'Product work rarely comes with a clear right answer, and waiting for certainty before deciding usually just means someone else decides for you, later, with less context. The skill is making a reasoned call with incomplete information and being transparent about what you don''t yet know, rather than projecting false confidence.', 3)
) as l(title, summary, seq);

-- Module 9 — Career and Practice
with m as (
  insert into public.curriculum_modules (pathway_id, module_number, title, description, display_order)
  select id, 9, 'Career and Practice', 'Building a body of real work, getting hired, and operating well once you''re in the seat.', 9
  from public.curriculum_pathways where slug = 'general-pm'
  returning id
)
insert into public.curriculum_lessons (module_id, title, summary, display_order)
select m.id, l.title, l.summary, l.seq from m, (values
  ('Building a Portfolio', 'A PM portfolio is strongest when it shows real reasoning, not a polished summary of an outcome — what the problem actually was, what you considered and rejected, and why. A single case study walked through in depth beats five bullet points of impact metrics with no story behind them.', 1),
  ('Interviewing as a PM', 'PM interviews test whether your thinking is structured under pressure, not whether you land on the "correct" answer to a hypothetical. Practicing out loud, with a real framework you can fall back on when you''re stuck, matters more than memorizing sample answers to common questions.', 2),
  ('Operating as a PM Day to Day', 'Most of the real job is unglamorous: writing things down clearly enough that decisions don''t need to be re-litigated, following up on the details nobody else is tracking, and noticing early when a project is quietly drifting off course. The daily discipline is what the frameworks are actually in service of.', 3)
) as l(title, summary, seq);

-- Activate the pathway itself now that it has real content — the other 5
-- explicitly stay 'coming_soon' until JT supplies their material.
update public.curriculum_pathways set status = 'live' where slug = 'general-pm';
