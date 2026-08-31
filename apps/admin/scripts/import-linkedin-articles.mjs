/**
 * LinkedIn Article Importer
 * Reads metadata from the spreadsheet, scrapes body + images from LinkedIn,
 * uploads images to Supabase Storage, and inserts published content records.
 */

import https from 'https'
import http from 'http'
import { URL } from 'url'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET        = 'content-images'
const AUTHOR_ID     = process.env.IMPORT_AUTHOR_ID ?? 'c79eb5ad-de7f-45ac-a70b-2fc54f7b9cb2'

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

// ─── Article data from spreadsheet ───────────────────────────────────────────

const ARTICLES = [
  { title: 'The Four Ps System Checklist', slug: 'four-ps-system-checklist', summary: 'A practical framework for evaluating product and business systems using a structured checklist approach.', tags: ['Product Strategy', 'Systems Thinking', 'Execution'], url: 'https://www.linkedin.com/pulse/four-ps-system-checklist-joshua-theophilus-mba-cspo--nwhff' },
  { title: 'Software is Not the Product', slug: 'software-is-not-the-product', summary: 'Why great products are defined by experience and value, not just technology or code.', tags: ['Product Thinking', 'UX', 'Strategy'], url: 'https://www.linkedin.com/pulse/software-product-joshua-theophilus-mba-cspo--tqxqf' },
  { title: 'System Governance is Not Optional', slug: 'system-governance-is-not-optional', summary: 'Why startups and product teams need governance structures early to scale sustainably.', tags: ['Operations', 'Governance', 'Startups'], url: 'https://www.linkedin.com/pulse/system-governance-optional-joshua-theophilus-mba-cspo--pbbif' },
  { title: 'Chaos is Not Speed', slug: 'chaos-is-not-speed', summary: 'The difference between urgency and chaos, and why confusing them kills product teams.', tags: ['Product Leadership', 'Execution', 'Team Culture'], url: 'https://www.linkedin.com/pulse/chaos-speed-joshua-theophilus-mba-cspo--vxydf' },
  { title: 'Purpose is Not a Mission Statement', slug: 'purpose-is-not-a-mission-statement', summary: 'Why organizational purpose must be lived through decisions, not written on walls.', tags: ['Leadership', 'Strategy', 'Culture'], url: 'https://www.linkedin.com/pulse/purpose-mission-statement-joshua-theophilus-mba-cspo--muxaf' },
  { title: 'Why Most Startups Fail Before Product Ever Matters', slug: 'why-most-startups-fail-before-product-ever-matters', summary: 'The foundational mistakes that doom startups long before product-market fit is even possible.', tags: ['Startups', 'Product Strategy', 'Founders'], url: 'https://www.linkedin.com/pulse/why-most-startups-fail-before-product-ever-matters-joshua-a32de' },
  { title: 'The Year I Learned Progress Beats Speed', slug: 'the-year-i-learned-progress-beats-speed', summary: 'Lessons from 2025 on why sustainable progress matters more than short-term velocity.', tags: ['Career', 'Growth', 'Reflection'], url: 'https://www.linkedin.com/pulse/2025-year-i-learned-progress-speed-direction-joshua-aci6e' },
  { title: 'Product Leadership in Africa', slug: 'product-leadership-in-africa', summary: 'Why the future of product-led growth belongs to African builders who understand local contexts.', tags: ['Africa', 'Product Leadership', 'Community'], url: 'https://www.linkedin.com/pulse/product-leadership-africa-why-future-belongs-builders-joshua-tbhie' },
  { title: 'AI is Not a Feature', slug: 'ai-is-not-a-feature', summary: 'Why AI must be treated as a core advantage layer, not a bolt-on feature in modern products.', tags: ['AI/ML', 'Product Strategy', 'Innovation'], url: 'https://www.linkedin.com/pulse/ai-isnt-feature-its-new-advantage-layer-modern-joshua-i7e3f' },
  { title: 'Revenue Must Reflect User Value', slug: 'revenue-must-reflect-user-value', summary: 'How to align your revenue model with the value you actually deliver to users.', tags: ['Monetization', 'Strategy', 'Product Thinking'], url: 'https://www.linkedin.com/pulse/your-revenue-model-must-reflect-user-value-theophilus-mba-cspo--56uaf' },
  { title: '5 Mindset Shifts That Changed My Career', slug: '5-mindset-shifts-that-changed-my-career', summary: 'The five pivotal mindset changes that transformed my journey from product manager to product leader.', tags: ['Career', 'Leadership', 'Growth'], url: 'https://www.linkedin.com/pulse/5-mindset-shifts-turned-me-from-product-manager-joshua-zcsff' },
  { title: 'What GTM Teams Can Learn from Street Hawkers', slug: 'what-gtm-teams-can-learn-from-street-hawkers', summary: 'African street hawkers understand positioning, urgency, and distribution better than most GTM teams.', tags: ['Go-to-Market', 'Africa', 'Sales', 'Strategy'], url: 'https://www.linkedin.com/pulse/what-gtm-teams-can-learn-from-african-street-hawkers-joshua-iryff' },
  { title: 'Why Great Products Fail', slug: 'why-great-products-fail', summary: 'The discipline and execution gaps that cause even well-built products to collapse in the market.', tags: ['Product Strategy', 'Execution', 'Founders'], url: 'https://www.linkedin.com/pulse/why-great-products-fail-discipline-founders-ignore-joshua-axy0f' },
  { title: 'Product Management is Not a To-Do List', slug: 'product-management-is-not-a-to-do-list', summary: 'Why product management is fundamentally about experience and business outcomes, not task completion.', tags: ['Product Management', 'Leadership', 'Strategy'], url: 'https://www.linkedin.com/pulse/product-management-to-do-list-its-experience-business-joshua-idzaf' },
  { title: 'Build, Test, Rethink, Repeat', slug: 'build-test-rethink-repeat', summary: 'Why startups that skip the rethink phase fail even when they have great execution.', tags: ['Startups', 'Product Development', 'Iteration'], url: 'https://www.linkedin.com/pulse/build-test-rethink-repeat-why-startups-fail-when-skip-joshua-obowf' },
  { title: 'Feedback is Not Demand', slug: 'feedback-is-not-demand', summary: 'Stop prioritising user feedback that will never translate into revenue or retention.', tags: ['Product Management', 'User Research', 'Prioritization'], url: 'https://www.linkedin.com/pulse/feedback-demand-stop-prioritizing-wont-pay-bills-joshua-uhgjf' },
  { title: "Your Product Isn't a Startup", slug: 'your-product-isnt-a-startup', summary: 'Why building soulless products under the startup label is the fastest path to irrelevance.', tags: ['Product Thinking', 'Startups', 'Culture'], url: 'https://www.linkedin.com/pulse/your-product-isnt-startup-stop-building-soulless-joshua-kacxc' },
  { title: 'From Product Manager to Startup Builder', slug: 'from-product-manager-to-startup-builder', summary: 'The real work of transitioning from PM to founder, and what one year in actually feels like.', tags: ['Career', 'Founders', 'Product Management'], url: 'https://www.linkedin.com/pulse/from-product-manager-startup-builder-real-work-one-pm-joshua-v7cnf' },
  { title: 'Stop Chasing Titles', slug: 'stop-chasing-titles', summary: 'Why chasing CTO, CPO, and other titles before building real structure leads to empty roles.', tags: ['Leadership', 'Career', 'Startups'], url: 'https://www.linkedin.com/pulse/stop-chasing-ctos-cpos-etcbuild-structure-first-joshua-4zmbf' },
  { title: 'The Hidden Luxury of Early Teams', slug: 'the-hidden-luxury-of-early-teams', summary: 'The underappreciated advantages that exist inside every early-stage team if you know where to look.', tags: ['Teams', 'Startups', 'Leadership'], url: 'https://www.linkedin.com/pulse/hidden-luxury-inside-every-earlystage-team-theophilus-mba-cspo--v53hf' },
  { title: 'True Agile', slug: 'true-agile', summary: 'What most founders get wrong about agile, and what iterative product development actually means.', tags: ['Agile', 'Product Development', 'Founders'], url: 'https://www.linkedin.com/pulse/true-agile-what-most-founders-get-wrong-iterative-joshua-kny2c' },
  { title: 'Aligning Product Strategy with Business Objectives', slug: 'aligning-product-strategy-with-business-objectives', summary: 'A framework for ensuring your product roadmap drives real business outcomes, not just features.', tags: ['Product Strategy', 'OKRs', 'Roadmapping'], url: 'https://www.linkedin.com/pulse/aligning-product-strategy-business-objectives-joshua-v7kxf' },
  { title: 'First Principles Thinking in Product', slug: 'first-principles-thinking-in-product', summary: 'How to implement first principles thinking to solve hard product problems from the ground up.', tags: ['Product Thinking', 'Framework', 'Strategy'], url: 'https://www.linkedin.com/pulse/implementing-first-principles-thinking-product-joshua-myw8f' },
  { title: 'Product North Star', slug: 'product-north-star', summary: 'How to define a product north star metric that genuinely aligns vision with business outcomes.', tags: ['Metrics', 'Product Strategy', 'OKRs'], url: 'https://www.linkedin.com/pulse/product-north-star-aligning-vision-business-outcomes-joshua-x8yxf' },
  { title: 'Why Most MVPs Are Too Viable', slug: 'why-most-mvps-are-too-viable', summary: 'The paradox of MVPs that are too polished to teach you anything meaningful about the market.', tags: ['MVP', 'Product Development', 'Startups'], url: 'https://www.linkedin.com/pulse/why-most-mvps-too-viable-minimal-enough-theophilus-mba-cspo--heogc' },
  { title: 'Product Speed as a Competitive Advantage', slug: 'product-speed-as-a-competitive-advantage', summary: 'Why speed of learning and iteration is the most overlooked competitive advantage in product.', tags: ['Product Strategy', 'Execution', 'Competitive Advantage'], url: 'https://www.linkedin.com/pulse/most-overlooked-competitive-advantage-product-speed-joshua-1ydef' },
  { title: 'Balancing Product Roles in Agile Teams', slug: 'balancing-product-roles-in-agile-teams', summary: 'How to balance product ownership and system ownership in modern agile product teams.', tags: ['Agile', 'Product Management', 'Teams'], url: 'https://www.linkedin.com/pulse/balancing-product-roles-agile-system-ownership-joshua-uuooc' },
  { title: 'Your Roadmap is a Lie', slug: 'your-roadmap-is-a-lie', summary: "Why your product roadmap is probably a lie, and why that's actually okay if you know it.', tags: ['Roadmapping', 'Product Strategy', 'Honesty'], url: 'https://www.linkedin.com/pulse/your-roadmap-lie-thats-okay-joshua-0trkf" },
  { title: 'Features Are Not the Solution', slug: 'features-are-not-the-solution', summary: 'Why adding features is rarely the answer, and what it actually means for your product strategy.', tags: ['Product Thinking', 'Strategy', 'Prioritization'], url: 'https://www.linkedin.com/pulse/why-features-solutionand-what-means-your-product-joshua-pahrf' },
  { title: 'Business, Product, and Process', slug: 'business-product-and-process', summary: 'Understanding the difference between being at the table and having a seat that actually matters.', tags: ['Leadership', 'Product Management', 'Strategy'], url: 'https://www.linkedin.com/pulse/business-product-vs-process-you-table-just-room-joshua-0r8bf' },
  { title: 'Why Startups in Africa Fail', slug: 'why-startups-in-africa-fail', summary: 'A frank look at overreach, misunderstood markets, and the real reasons African startups struggle.', tags: ['Africa', 'Startups', 'Strategy'], url: 'https://www.linkedin.com/pulse/why-startups-africa-fail-tale-overreach-misunderstood-joshua-1i4nf' },
  { title: 'State of Product Management 2024', slug: 'state-of-product-management-2024', summary: 'Key challenges, emerging trends, and what product managers need to focus on heading into 2025.', tags: ['Product Management', 'Trends', 'Career'], url: 'https://www.linkedin.com/pulse/state-product-management-2024-challenges-trends-2025-joshua-r8tjf' },
  { title: 'What My First Agile Class in Almost a Year Reminded Me', slug: 'what-my-first-agile-class-reminded-me', summary: 'Going back to teaching agile fundamentals and the surprising things it reminded me about product work.', tags: ['Agile', 'Learning', 'Product Management'], url: 'https://www.linkedin.com/pulse/what-my-first-agile-class-almost-year-reminded-me-joshua-0lsrf/' },
  { title: 'Understanding Engineering, Product, and Design Workflows', slug: 'understanding-engineering-product-design-workflows', summary: 'How engineering, product, and design actually work together, and where most teams get it wrong.', tags: ['Product Design', 'Engineering', 'Teams'], url: 'https://www.linkedin.com/pulse/understanding-engineering-product-design-workflows-joshua-theophilus-jqike/' },
  { title: 'The Failure Was Not the Product. It Was the Thinking.', slug: 'the-failure-was-not-the-product-it-was-the-thinking', summary: 'Why the biggest product failures are rooted in broken thinking, not broken execution.', tags: ['Product Thinking', 'Failure', 'Leadership'], url: 'https://www.linkedin.com/pulse/failure-product-thinking-behind-joshua-theophilus-wkboe/' },
  { title: 'The Hidden Cost of Meetings', slug: 'the-hidden-cost-of-meetings', summary: 'How unnecessary meetings quietly drain startup velocity and what to do about it.', tags: ['Productivity', 'Startups', 'Execution'], url: 'https://www.linkedin.com/pulse/hidden-cost-meetings-how-startups-quietly-lose-speed-joshua-kf0xe/' },
  { title: 'Your Marketing Is Not Failing; Your System Is', slug: 'your-marketing-is-not-failing-your-system-is', summary: 'Why marketing failures are almost always symptoms of broken underlying systems, not bad campaigns.', tags: ['Go-to-Market', 'Marketing', 'Systems Thinking'], url: 'https://www.linkedin.com/pulse/your-marketing-failing-system-joshua-theophilus-mba-cspo--iqnwc/' },
  { title: "Your Product Doesn't Have a Growth Problem. It Has a Value Problem.", slug: 'your-product-doesnt-have-a-growth-problem', summary: "Stop chasing growth tactics when your real problem is that users don't yet feel the value.", tags: ['Growth', 'Product Strategy', 'Metrics'], url: 'https://www.linkedin.com/pulse/your-product-doesnt-have-growth-problem-has-theophilus-mba-cspo--iurqf/' },
  { title: 'The Friction Audit: How to Map Operational Waste', slug: 'the-friction-audit-how-to-map-operational-waste', summary: 'A step-by-step method for identifying and eliminating operational friction before it kills your team.', tags: ['Operations', 'Productivity', 'Framework'], url: 'https://www.linkedin.com/pulse/friction-audit-how-map-operational-waste-before-your-joshua-sroyf/' },
  { title: 'Why Your Startup Needs Internal GTM Before External', slug: 'why-your-startup-needs-internal-gtm-before-external', summary: 'Building internal clarity and alignment on your product story before you go to market externally.', tags: ['Go-to-Market', 'Startups', 'Strategy'], url: 'https://www.linkedin.com/pulse/why-your-startup-needs-internal-gtm-before-external-joshua-umv1f/' },
  { title: 'The Growth Hack Illusion', slug: 'the-growth-hack-illusion', summary: 'Why growth spikes from hacks feel like progress but are often disguising fundamental product weakness.', tags: ['Growth', 'Product Strategy', 'Startups'], url: 'https://www.linkedin.com/pulse/growth-hack-illusion-why-spikes-feel-like-progress-joshua-d8uif/' },
  { title: 'Your Tools Are Not Your Systems', slug: 'your-tools-are-not-your-systems', summary: "Confusing tools with systems is one of the most expensive mistakes startup teams make.", tags: ['Operations', 'Systems Thinking', 'Startups'], url: 'https://www.linkedin.com/pulse/your-tools-systems-joshua-theophilus-mba-cspo--4getc/' },
  { title: 'Your Roadmap Is Not Your Strategy', slug: 'your-roadmap-is-not-your-strategy', summary: 'Why mistaking your roadmap for strategy leaves your product without real direction.', tags: ['Roadmapping', 'Product Strategy', 'Leadership'], url: 'https://www.linkedin.com/pulse/your-roadmap-strategy-joshua-theophilus-mba-cspo--ke0te/' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const lib = parsed.protocol === 'https:' ? https : http
    const req = lib.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http') ? res.headers.location : `https://${parsed.hostname}${res.headers.location}`
        fetchHtml(next).then(resolve).catch(reject)
        return
      }
      let data = ''
      res.setEncoding('utf8')
      res.on('data', c => { data += c })
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(25000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

async function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const lib = parsed.protocol === 'https:' ? https : http
    const req = lib.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.linkedin.com/',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http') ? res.headers.location : `https://${parsed.hostname}${res.headers.location}`
        fetchBuffer(next).then(resolve).catch(reject)
        return
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    })
    req.on('error', reject)
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function htmlToText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (_, level, text) => '\n\n' + '#'.repeat(Number(level)) + ' ' + text.replace(/<[^>]+>/g, '') + '\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, (_, text) => '• ' + text.replace(/<[^>]+>/g, '').trim() + '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractBody(html) {
  // Remove scripts, styles, nav, header, footer, ads
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  // LinkedIn article body containers (try each in order)
  const patterns = [
    /class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*(?:article-social|article-footer|related|more-articles)[^"]*")/i,
    /class="[^"]*reader-article-content[^"]*"[^>]*>([\s\S]*?)(?=<\/section|<div[^>]+class="[^"]*reader)/i,
    /class="[^"]*article__body[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*(?:article-social|footer)[^"]*")/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /class="[^"]*main-content[^"]*"[^>]*>([\s\S]*?)(?=<\/main|<div[^>]+class="[^"]*sidebar)/i,
  ]

  for (const pat of patterns) {
    const m = cleaned.match(pat)
    if (m && m[1] && m[1].length > 300) {
      const text = htmlToText(m[1])
      if (text.length > 200) return text
    }
  }

  // Fallback: collect all meaningful paragraphs
  const paras = [...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m => htmlToText(m[1]))
    .filter(p => p.length > 40 && !p.includes('cookie') && !p.includes('sign in') && !p.includes('LinkedIn'))
  return paras.join('\n\n')
}

function extractOgImage(html) {
  const m = html.match(/property="og:image"[^>]+content="([^"]+)"/i)
    || html.match(/name="twitter:image"[^>]+content="([^"]+)"/i)
    || html.match(/content="([^"]+)"[^>]+property="og:image"/i)
  return m ? m[1].trim() : null
}

async function uploadImage(buffer, originalUrl) {
  const ext = originalUrl.includes('.png') ? 'png' : originalUrl.includes('.gif') ? 'gif' : 'jpg'
  const contentType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
  const hash = crypto.createHash('md5').update(originalUrl).digest('hex').slice(0, 12)
  const filename = `articles/${hash}.${ext}`

  const { error } = await sb.storage.from(BUCKET).upload(filename, buffer, { contentType, upsert: true })
  if (error) { console.warn(`    ⚠ Upload failed: ${error.message}`); return null }

  return sb.storage.from(BUCKET).getPublicUrl(filename).data.publicUrl
}

async function migrateImage(imageUrl) {
  if (!imageUrl) return null
  try {
    const buf = await fetchBuffer(imageUrl)
    if (!buf || buf.length < 2000) return null
    return await uploadImage(buf, imageUrl)
  } catch (e) {
    console.warn(`    ⚠ Image fetch failed: ${e.message}`)
    return null
  }
}

async function uniqueSlug(base) {
  let slug = base, attempt = 0
  while (true) {
    const { data } = await sb.from('content').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
    slug = `${base}-${++attempt}`
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const results = []

for (let i = 0; i < ARTICLES.length; i++) {
  const art = ARTICLES[i]
  console.log(`\n[${i + 1}/${ARTICLES.length}] ${art.title}`)

  // Scrape LinkedIn
  let html = ''
  try {
    html = await fetchHtml(art.url)
  } catch (e) {
    console.log(`  ✗ Fetch failed: ${e.message}`)
    results.push({ ...art, status: 'failed', error: e.message })
    continue
  }

  const body = extractBody(html)
  const ogImage = extractOgImage(html)
  console.log(`  Body: ${body.length} chars | Image: ${ogImage ? 'found' : 'none'}`)

  // Upload cover image
  let coverImageUrl = null
  if (ogImage) {
    coverImageUrl = await migrateImage(ogImage)
    if (coverImageUrl) console.log(`  ✓ Image uploaded`)
  }

  const slug = await uniqueSlug(art.slug)

  const { data, error } = await sb.from('content').insert({
    title:           art.title,
    slug,
    type:            'article',
    status:          'published',
    published_at:    new Date().toISOString(),
    summary:         art.summary,
    body:            body || art.summary,
    cover_image_url: coverImageUrl,
    file_url:        null,
    tags:            art.tags,
    pricing_type:    'free',
    selar_url:       null,
    author_id:       AUTHOR_ID,
  }).select('id').single()

  if (error) {
    console.log(`  ✗ DB error: ${error.message}`)
    results.push({ ...art, status: 'failed', error: error.message })
  } else {
    console.log(`  ✓ Published → id=${data.id} slug="${slug}"`)
    results.push({ ...art, status: 'ok', id: data.id })
  }

  // Polite delay
  if (i < ARTICLES.length - 1) await new Promise(r => setTimeout(r, 2000))
}

// Summary
const ok = results.filter(r => r.status === 'ok')
const failed = results.filter(r => r.status === 'failed')
console.log(`\n${'─'.repeat(50)}`)
console.log(`✓ Published: ${ok.length}`)
console.log(`✗ Failed:    ${failed.length}`)
if (failed.length) {
  console.log('\nFailed:')
  failed.forEach(r => console.log(`  ${r.title} — ${r.error}`))
}
