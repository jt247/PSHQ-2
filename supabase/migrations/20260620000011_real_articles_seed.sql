-- ============================================================
-- Migration 011: Real articles seed + featured column
-- ============================================================
-- Removes placeholder articles, seeds 6 real articles,
-- adds featured and source columns to content.
-- ============================================================

-- 1. Add new columns
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source   text;

-- 2. Remove placeholder articles (cascade handles interactions, comments, etc.)
DELETE FROM public.content
WHERE slug IN (
  'the-5-stages-of-a-great-product-discovery',
  'writing-a-prd-engineers-actually-read'
);

-- 3. Seed 6 real articles
-- Using dollar-quoted strings to handle apostrophes and special characters.

INSERT INTO public.content
  (title, slug, type, status, summary, body, cover_image_url, tags, pricing_type, view_count, source, published_at)
VALUES

-- ARTICLE 1
(
  'Why AI-Assisted Development Beats Pure Prompt-to-App Tools',
  'why-ai-assisted-development-beats-pure-prompt-to-app-tools',
  'article',
  'published',
  'A first-hand account of outgrowing a prompt-to-app tool while building Product Slice HQ, and what makes AI-assisted development inside a real codebase a fundamentally different and more stable choice.',
  $a1$A few months ago, I was working on the first version of Product Slice HQ. I had built it on a tool that lets you describe an app in plain language and watch it get built in front of you. It felt like magic in the beginning. Then it started breaking.

I would open the platform and something that worked yesterday would suddenly stop working. A button would stop responding. A page would load blank. And I had no real way to find out why. I could not open a file and read the actual code. I could not run anything myself to test what was happening. All I had was a chat box where I described the problem and waited to see if the next attempt would fix it, or quietly break something else instead.

That experience is what eventually pushed me to rebuild the entire platform using a different kind of tool. Not because the first one was bad. It got me from nothing to something fast, which is exactly what it is good at. But it could not give me what I needed once the project became something I actually wanted to run and maintain.

#### Two different ways of building with AI

There are two broad categories of AI development tools right now, and people often lump them together because they all involve typing instructions and getting code back. They are not the same thing.

The first category includes tools like Lovable, Replit, Bolt, and Adalo. You describe what you want, the tool generates a working app, and you keep talking to it to make changes. Everything happens inside that platform. You rarely see the actual code, and you usually do not need to.

The second category includes tools like Claude Code, Codex, and Antigravity. These work inside a real codebase, on your actual machine or a connected development environment, alongside an editor like VS Code and a regular terminal. The AI writes real files. You can open every one of them. You can run the project yourself. You can use version control the way you would on any other software project, because it is a normal software project. There just happens to be an AI agent helping you write it.

#### Why being able to see your own code matters

When something breaks in a prompt-to-app tool, you are mostly guessing. You describe the bug again, hope the next attempt fixes it, and find out only after the fact whether it worked or made things worse somewhere else.

When something breaks in a tool like Claude Code, you can actually look. You can read the error message, find the line it points to, and either fix it yourself or give the AI a precise instruction instead of a vague one. There is a real difference between telling an AI "it is broken, please fix it" and telling it "this function is failing because the database call on line 84 is not being awaited properly." The second one comes from actually understanding what is happening. The first one comes from hoping someone else figures it out for you.

This also changes how much control you have over your own architecture. Closed platforms make a lot of decisions for you. How your data is organized, how the app manages information as people use it, how the whole project is structured behind the scenes. Most of that stays hidden from you, and you usually only discover it once something goes wrong. When you work inside a real codebase, you decide those things yourself, or at least you can read and understand the decisions that were made, because you were there when they were made.

There is also the question of what happens to your project later. Code built inside a closed platform mostly stays inside that platform. Code built in a normal development environment can go anywhere. It can sit on GitHub. It can deploy to Render, Vercel, or wherever you choose. It can connect to whichever database, analytics tool, or payment system you actually want to use, not just the ones the platform has already built a connection for.

#### You also learn something

This part gets overlooked a lot. Every time I sit with Claude Code while it works through my own codebase, reading through files, writing database changes, explaining what it just did, I come away understanding my own project better. I know how my database is structured. I know how my authentication works. I know what each part of my admin dashboard is actually doing under the surface. Not because someone summarized it for me afterward, but because I was right there while it was being built.

That kind of understanding is hard to get from a tool that never lets you see inside.

#### This is not an argument against the other tools

Lovable, Replit, and similar platforms are genuinely useful. If you want to test an idea quickly, with no setup and no technical background required, they are often the right choice. I used one to build the very first version of Product Slice HQ, and it did exactly what I needed at that stage.

The problem only shows up once you move past testing an idea and into building something you plan to keep running. Speed and stability are two different goals, and the tools that are best at one are not always the ones best at the other.

If you are testing something you might throw away in a month, use whatever gets you there fastest. If you are building something you intend to keep, grow, and actually rely on, it is worth working in a way that lets you see what you are building. You will need that the first time something breaks at two in the morning and you actually want to know why.$a1$,
  'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=1200&q=80',
  ARRAY['AI Development', 'Coding Tools', 'Product Building'],
  'free',
  312,
  'platform',
  now() - interval '3 days'
),

-- ARTICLE 2
(
  'My AI Coding Stack, Ranked by Six Months of Actually Building With It',
  'my-ai-coding-stack-ranked-by-six-months-of-actually-building-with-it',
  'article',
  'published',
  'Six months of building across multiple AI coding platforms, ranked honestly: why Claude Code plus Stitch sits at the top, what makes the Google AI suite a strong second, and why the right stack depends on how you actually work.',
  $a2$People ask me which AI coding tool is the best one. I understand why they ask, but the question itself is a little off. The better question is which tool fits how you actually work, what you can afford, and what you are trying to build. I will give you my honest ranking, but I want to be clear about something first. This is not a scientific test. This is what I learned after spending real months building real projects, switching between tools, and paying attention to what actually got me to a working product without burning my budget or my patience.

I spent close to six months this year prototyping across different AI coding platforms. The last three months I have spent almost entirely inside Claude Code. The difference was clear enough that I do not need to convince myself of it anymore.

#### My first stack: Claude Code, Stitch, VS Code, and the terminal

This is what I reach for every day. Claude Code does the heavy lifting on the actual building, reading my codebase, writing files, running commands. Stitch, which is Google design tool, lets me design the interface separately and hand the design system over so the code matches what I actually wanted it to look like, instead of whatever a default theme gives me. VS Code is where I sit and watch everything happen, and the terminal is where I run, test, and deploy.

What makes this stack work for me is not any single tool being magical. It is that all four pieces fit cleanly into how I already work. I am not learning a new way of thinking about my project. I am just building it, with help.

In six months of switching things around, this combination has given me the most stable results. I have been able to put together real, working platforms with this stack more reliably than with anything else I tried. That track record is the entire reason it sits at the top of my list.

#### My second stack: the Google AI suite

Antigravity, Stitch, Google AI Studio, and Google Cloud Console all sit inside one subscription. That matters more than people give it credit for. When you subscribe to the Google AI suite, you are not paying separately for a design tool, a coding agent, and a hosting console. It is one ecosystem, and the tools inside it are built to talk to each other.

I put this second for a practical reason, not because it is weaker. It fits naturally into a workflow that already touches Google tools, and it is something a lot of people can access without stacking multiple subscriptions on top of each other. For anyone starting out, or anyone who wants strong tools without juggling five different bills, this is a genuinely solid place to live.

#### My third stack: Codex, paired with any editor

Codex is a strong tool, and I rank it third mainly because of where it sits compared to the first two for my own workflow. It is widely available, and it is often the first serious coding agent people try, which makes it a reasonable starting point if you are not ready to commit to a full ecosystem yet.

I want to be direct about one thing. I do not include Cursor in this list, and that is intentional, not an oversight. Cursor is a capable editor. It simply does not sit inside either ecosystem the way Antigravity sits inside the Google AI suite, or the way Claude Code sits inside my own daily workflow. That does not make it a bad choice. It just is not part of how I personally build, so I am not going to recommend it as though I have tested it the way I have tested the tools above.

#### Why this ranking is mine, not universal

I want to repeat something I said at the start. This list reflects six months of my own time, my own projects, and my own budget. Someone with a different workflow, a different budget, or a different kind of project might land somewhere else entirely, and that would be a reasonable outcome too.

What I would tell anyone trying to choose is this. Pick a stack where the pieces actually work together, instead of picking the flashiest individual tool and hoping it fits into whatever else you already use. The tools matter less than how well they sit inside your actual day.$a2$,
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&q=80',
  ARRAY['AI Development', 'Coding Tools', 'Strategy'],
  'free',
  287,
  'platform',
  now() - interval '5 days'
),

-- ARTICLE 3
(
  'The Unsexy Part of Vibe Coding That Decides If It Survives',
  'the-unsexy-part-of-vibe-coding-that-decides-if-it-survives',
  'article',
  'published',
  'The architectural decisions that separate vibe-coded projects that survive from ones that quietly fall apart — and why structure, data design, and security need to come before any feature work begins.',
  $a3$Nobody gets excited about talking about architecture. It does not make a good screenshot. It is not the part of building that people post about. But it is the single biggest reason most vibe-coded projects either survive past their first month or quietly fall apart.

There is a popular opinion online that every AI-built project is fragile by nature. I do not think that is true. I think most AI-built projects are fragile because nobody thought about the structure underneath them before they started building. The tool is not the problem. The lack of a plan is.

#### What actually breaks first

When people describe a vibe-coded project breaking, they usually describe symptoms. A feature stops working. A page loads incorrectly. Data shows up in the wrong place. Almost none of these symptoms are random. They are nearly always the result of a structure that was never properly set up to handle growth.

A project that starts with one database table doing five different jobs will eventually fail in a way that looks mysterious, but is not mysterious at all. A project where every page fetches and shapes its own data separately, instead of relying on one shared source of truth, will eventually have screens that quietly disagree with each other. These are not AI mistakes. These are structural mistakes that any AI, no matter how capable, will happily build on top of if you do not stop it first.

#### Setting up before you build, not after

The projects I have had the most stability with all share something in common. Before any real feature work began, I spent time deciding how data would be organized, how different parts of the app would talk to each other, and where the boundaries would sit between what runs on a server and what runs in front of the user.

This sounds like extra work, and in a narrow sense it is. But it is a small amount of extra work upfront against a much larger amount of painful work later, the kind where you are trying to fix a bug that touches five different parts of your app because none of them were ever properly separated to begin with.

#### Security is part of this, not a separate step

A lot of people treat security as something you bolt on at the end, right before launch. That is backwards. Decisions like who can see what, who can edit what, and what happens if someone tries to access something they should not, need to be part of the structure from the beginning. Adding proper access rules after a project is already built usually means tearing through code that was never designed to support them.

This matters even more once a project has different types of users. A regular member, a support team member, and an administrator should never be working off the same set of permissions by accident. Getting that wrong is not a small bug. It is the kind of problem that can expose private information or break trust with the people using what you built.

#### Not every vibe-coded platform deserves the bad reputation

There is a narrative that anything built quickly with AI assistance is automatically unstable. I understand where that comes from, because a lot of fast, careless builds do fall apart. But the instability usually comes from skipping the planning step, not from the tools themselves.

A project built with proper structure, clear data design, and security considered from day one can be just as stable as something built the traditional way, often faster. The difference is not the tool you use. It is whether you treated the early decisions as seriously as the exciting parts.

If you take one thing from this, take this. Spend real time on your structure before you start generating features. It will not feel productive in the moment. It is the most productive hour you will spend on the entire project.$a3$,
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
  ARRAY['Architecture', 'AI Development', 'Product Building'],
  'free',
  198,
  'platform',
  now() - interval '8 days'
),

-- ARTICLE 4
(
  'What I Actually Built, and What Broke: Product Slice HQ, Product Nerve AI, and AttriHub',
  'what-i-actually-built-and-what-broke',
  'article',
  'published',
  'A behind-the-scenes look at three real AI-assisted builds this year — Product Slice HQ, Product Nerve AI, and AttriHub — including what broke, what it cost in time and patience, and what all three taught me.',
  $a4$I have built three real things this year using AI-assisted tools. Not prototypes I abandoned after a weekend. Actual products, each one solving a problem I personally had. I want to walk through what each one was, why I built it, and what went wrong along the way, because the broken parts taught me more than the parts that worked smoothly.

#### Product Slice HQ

This was the first one. For years, I had been mentoring and training people in product, growth, and tech, and every resource I created lived somewhere different. Templates sat in a Google Drive folder. Articles were written for LinkedIn, which meant they belonged to LinkedIn, not to me. If that account ever disappeared, years of writing would disappear with it. I wanted one place my mentees, and anyone else who never had the chance to be mentored directly, could come back to.

I built the first version on a prompt-to-app tool, and it worked well enough to prove the idea mattered. People used it. Then it started breaking in ways I could not see into or fix, which is what eventually pushed the entire rebuild into a different kind of tool, one where I could actually see and control what was happening underneath.

#### Product Nerve AI

This one came out of a very specific frustration. After finishing Founder Institute and a few other accelerator programs in 2025, I kept running into the same problem while mentoring founders, both inside those programs and outside them. It was a persistent issue, the kind that came up in conversation after conversation, and nobody seemed to be solving it directly.

So I built something for it. The early days of building Product Nerve AI were genuinely difficult. There were stretches where I sat with a bug for days, trying to understand why something that should have worked simply did not. That was the first time I really understood what people mean when they say a project has to be worth fighting for, because fighting for it is exactly what building it required.

#### AttriHub

This one is smaller, and I have not even made it public yet. It came from a problem I kept running into on a particular job. I needed to run GTM campaigns quickly, and every time I needed something tracked properly, I was stuck configuring Google Analytics, setting up custom events, and waiting on developers who had their own priorities. Developers becoming the bottleneck for something that should have taken an afternoon was the final push.

So I built a simple analytics and UTM tracking tool for myself. Nothing complicated. Just something that let me set up tracking and run campaigns without waiting on anyone else calendar.

#### What all three taught me

None of these three started as a business plan. Each one started because I personally needed the thing to exist. That turned out to matter more than I expected, because the moments where a bug took days to fix, or a feature refused to work the way it should, were exactly the moments where having a real stake in the outcome kept me from giving up.

If you are trying to figure out what to build, I would not start by researching ideas or scanning what is trending. I would start by paying attention to what keeps frustrating you personally. That frustration is a much better compass than any market research you could do from the outside.$a4$,
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=80',
  ARRAY['Founder Stories', 'AI Development', 'Product Building'],
  'free',
  243,
  'platform',
  now() - interval '12 days'
),

-- ARTICLE 5
(
  'Stop Copying App Store Screenshots. Build the Tool That Keeps You Up Debugging for a Week.',
  'stop-copying-app-store-screenshots',
  'article',
  'published',
  'Why copying popular apps is a reliable path to giving up the moment something breaks, and what to build instead — the thing that has frustrated you personally long enough that fixing it actually feels worth the effort.',
  $a5$There is a piece of advice that circulates constantly on social media. Go to the app store, find something popular, copy what it does, and build your own version. It gets repeated so often that it starts to sound like wisdom. It is not wisdom. It is a shortcut that works for almost nobody who actually tries it.

#### Why this advice falls apart in practice

Copying an existing app gives you a feature list, not a reason to finish building it. The moment something breaks, and something always breaks, you need a reason to keep going that has nothing to do with the screenshot you copied. If your only motivation was that the app looked popular, that motivation runs out the first time you spend three days stuck on a bug nobody is paying you to fix.

I learned this directly while building Product Nerve AI. There were nights where nothing worked, where a fix created two new problems, where it would have been completely reasonable to walk away. The only reason I did not was that the problem I was solving was real and personal to me. It was not borrowed from someone else app store listing.

#### The actual test worth using

Here is a better way to decide what to build. Think about whether the problem has genuinely kept you occupied. Not in a casual way, but in the way where you are still thinking about it three days later, still trying to find a workaround, still annoyed that it has not been solved properly yet. If a problem can hold your attention for a week without you getting bored of it, it is probably worth building something for.

This does not mean you need a grand vision or a five year plan. It means the frustration has to be real enough that fixing it for yourself feels worth the time, even before anyone else is involved.

#### Build for yourself first

Every project I have built this year started as something for me. Product Slice HQ started because I needed one place to put my own resources. Product Nerve AI started because I kept running into the same wall while mentoring founders. AttriHub started because I personally needed faster campaign tracking and got tired of waiting on developers.

In every case, I was not designing for an imagined user persona. I was designing for the person sitting in front of the screen, which was me. Once each tool actually worked for my own use, it became obvious that other people had been dealing with the exact same frustration the whole time. That is usually how it goes. If a problem is bothering you specifically, it is very likely bothering other people too, quietly, without anyone talking about it online.

#### Skip the trending app, find your own wall

The next time someone tells you to scroll the app store for inspiration, ignore it. Instead, pay attention to what keeps annoying you in your own work, your own tools, your own daily routine. That annoyance is a far more reliable starting point than anything you could copy from someone else product.

Build the thing that solves your own problem first. If it is good enough to keep you motivated through a difficult week of debugging, it is probably good enough for other people too.$a5$,
  'https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?w=1200&q=80',
  ARRAY['Founder Stories', 'Strategy', 'Product Building'],
  'free',
  156,
  'platform',
  now() - interval '16 days'
),

-- ARTICLE 6
(
  'The One-Customer-Problem Framework: How to Actually Ship Something With AI Tools',
  'the-one-customer-problem-framework',
  'article',
  'published',
  'A five-part framework for shipping something real with AI tools: keep the first version to one customer, one problem, and one killer feature — and why tight scope matters even more with prompt-to-app platforms.',
  $a6$A lot of people start building with AI tools and never actually finish anything. Not because the tools fail them, but because they try to build too much at once. This is especially true with prompt-to-app platforms like Lovable and Replit, where every additional feature adds real cost and real risk of the whole thing breaking. The fix is not a better tool. It is a simpler approach to what you are building in the first place.

#### Why complexity is the real enemy

These platforms work best when what you are asking them to build stays simple and focused. The moment you start layering in feature after feature, the chances of something breaking go up, and so does your credit spend trying to debug it. I have watched people burn through budget chasing a long feature list before they ever had something that worked reliably for even one clear use case.

The fix is not complicated, but it does require discipline. Keep the first version small enough that it can actually hold together.

#### The framework

I use a simple structure whenever I am starting something new. One customer. One problem. One solution. One killer feature. One value proposition.

Start with one customer. This can be a specific type of person, or it can be you. Find one problem that customer actually has, not a list of five problems you are hoping to solve eventually. Build one solution to that one problem. Inside that solution, identify the one feature that actually delivers the value, the thing that, if it worked perfectly and nothing else did, would still make the whole project worth using. Then build a clear value proposition around exactly that.

Everything else can come later. Most of it should come later.

#### Build for yourself, then notice you are not alone

The easiest way to apply this framework is to start with yourself as the one customer. Find the one problem you personally deal with. Build the one solution that fixes it for you specifically.

What usually happens next is that you realize other people have been dealing with the exact same problem, quietly, without doing anything about it. That is when the project becomes bigger than just a personal fix, but it only gets there because the first version was simple enough to actually finish and use.

#### Why this matters more with AI tools specifically

With traditional development, scope creep is expensive in time. With AI-assisted prompt-to-app tools, scope creep is expensive in both time and money, and it actively increases the odds of the whole project becoming unstable. Every added feature is another thing that can interact badly with everything else already built, and on these platforms, you often do not have full visibility into why something broke once it does.

Keeping things lean is not just a nice habit. It is the difference between shipping something that works and spending your entire budget rebuilding the same five features over and over because the project grew faster than its foundation could support.

Start with one customer. Solve one problem properly. Everything you build after that will stand on much steadier ground.$a6$,
  'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1200&q=80',
  ARRAY['Strategy', 'AI Development', 'Product Building'],
  'free',
  204,
  'platform',
  now() - interval '21 days'
)

ON CONFLICT (slug) DO NOTHING;

-- 4. Mark the 3 featured articles
UPDATE public.content SET featured = true WHERE slug IN (
  'why-ai-assisted-development-beats-pure-prompt-to-app-tools',
  'my-ai-coding-stack-ranked-by-six-months-of-actually-building-with-it',
  'what-i-actually-built-and-what-broke'
);
