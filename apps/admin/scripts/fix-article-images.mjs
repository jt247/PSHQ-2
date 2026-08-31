// Fix NULL cover_image_url for imported LinkedIn articles
// Uses curated Unsplash photos matched to each article's topic

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

function img(id) {
  return `https://images.unsplash.com/photo-${id}?w=1200&q=80`
}

// Curated Unsplash photo assignments per article slug
const IMAGE_MAP = {
  // Strategy / Roadmap
  'your-roadmap-is-a-lie':                        img('1557804506-669a67965ba0'),
  'your-roadmap-is-not-your-strategy':            img('1488229297937-bdfd2cee6c1a'),
  'aligning-product-strategy-with-business-goals': img('1504711434969-e33886168f5c'),
  'product-north-star':                           img('1446776811953-b23d57bd21aa'),
  'first-principles-thinking-in-product':         img('1633613286991-611fe299c4be'),
  'chaos-is-not-speed':                           img('1558618666-fcd25c85cd64'),

  // Systems / Process / Operations
  'your-tools-are-not-your-systems':              img('1518770660439-4636190af475'),
  'the-friction-audit-how-to-map-operational-gaps': img('1454165804606-c3d57bc86b40'),
  'system-governance-is-not-optional':            img('1551288049-bebda4e38f71'),
  'software-is-not-the-product':                  img('1461749280684-dccba630e2f6'),
  'business-product-and-process':                 img('1507679799987-c73779587ccf'),
  'the-four-ps-system-checklist':                 img('1542744173-8e7e53415bb0'),

  // GTM / Growth / Marketing
  'the-growth-hack-illusion':                     img('1460925895917-afdab827c52f'),
  'why-your-startup-needs-internal-gtm-before-external-gtm': img('1553729459-efe14ef6055d'),
  'your-marketing-is-not-failing-your-system-is': img('1432888498266-38ffec3eaf0a'),
  'what-gtm-teams-can-learn-from-street-hawkers': img('1605559424843-9073199d6a48'),
  'revenue-must-reflect-user-value':              img('1553729459-efe14ef6055d'),

  // Product Management Core
  'your-product-doesnt-have-a-growth-problem':    img('1519389950473-47ba0277781c'),
  'features-are-not-the-solution':                img('1483058712412-4245e9b90334'),
  'balancing-product-roles-in-agile-teams':       img('1522071820081-009f0129c71c'),
  'product-speed-as-a-competitive-advantage':     img('1565688534279-b61bf3e3e2ce'),
  'why-most-mvps-are-too-viable':                 img('1467232004584-a241de8bcf5d'),
  'product-management-is-not-a-to-do-list':       img('1484480974693-6ca0a78fb36b'),
  'why-great-products-fail':                      img('1578328819058-d69f769a3ba1'),
  'build-test-rethink-repeat':                    img('1531403009284-440f080d1e12'),
  'feedback-is-not-demand':                       img('1556742049-0cfed4f6a45d'),

  // Leadership / Career
  'the-hidden-cost-of-meetings':                  img('1600880292203-757bb62b4baf'),
  'stop-chasing-titles':                          img('1499750310107-5fef28a66643'),
  'from-product-manager-to-startup-builder':      img('1504384308090-c894fdcc538d'),
  '5-mindset-shifts-that-changed-my-career':      img('1513258496099-48168024aec0'),
  'the-year-i-learned-progress-beats-speed':      img('1506784983877-45594efa4cbe'),
  'the-hidden-luxury-of-early-teams':             img('1522202176988-66273c2fd55f'),
  'product-leadership-in-africa':                 img('1531482615713-2afd69097998'),

  // Startups / Africa / Failure
  'why-startups-in-africa-fail':                  img('1551836022-d5d88e9218df'),
  'the-failure-was-not-the-product-it-was-the-system': img('1493723843671-1d655e66ac1c'),
  'why-most-startups-fail-before-product-even-matters': img('1559136555-9303baea8eae'),
  'your-product-isnt-a-startup':                  img('1559136555-9303baea8eae'),

  // Agile / Process
  'true-agile':                                   img('1552664834416-0a5cf58aa3a8'),
  'what-my-first-agile-class-in-almost-a-year-taught-me': img('1516321318423-f06f85e504b3'),

  // Misc
  'state-of-product-management-2024':             img('1551288049-bebda4e38f71'),
  'understanding-engineering-product-and-design-collaboration': img('1573164713988-8665fc963095'),
  'purpose-is-not-a-mission-statement':           img('1455849318743-b2233052fcff'),
  'ai-is-not-a-feature':                          img('1485827404703-89b55fcc595e'),
}

async function run() {
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }

  // Fetch all articles with NULL cover_image_url
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/content?type=eq.article&cover_image_url=is.null&select=id,slug,title`,
    { headers }
  )
  const articles = await res.json()
  console.log(`Found ${articles.length} articles with no image\n`)

  let updated = 0
  let skipped = 0

  for (const article of articles) {
    const imageUrl = IMAGE_MAP[article.slug]
    if (!imageUrl) {
      console.log(`⚠  No mapping for slug: ${article.slug}`)
      skipped++
      continue
    }

    const patch = await fetch(
      `${SUPABASE_URL}/rest/v1/content?id=eq.${article.id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ cover_image_url: imageUrl }),
      }
    )

    if (patch.ok) {
      console.log(`✓  ${article.title.slice(0, 50)}`)
      updated++
    } else {
      const err = await patch.text()
      console.log(`✗  ${article.slug} — ${err}`)
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`)
}

run().catch(console.error)
