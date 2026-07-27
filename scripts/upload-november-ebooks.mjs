import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync, existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const envPath = new URL('../.env.local', import.meta.url).pathname
const env = readFileSync(envPath, 'utf-8')
const envVars = Object.fromEntries(
  env.split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] })
)

const ACCOUNT_ID = envVars.CLOUDFLARE_R2_ACCOUNT_ID
const BUCKET = envVars.CLOUDFLARE_R2_BUCKET_NAME
const ACCESS_KEY = envVars.CLOUDFLARE_R2_ACCESS_KEY
const SECRET_KEY = envVars.CLOUDFLARE_R2_SECRET_KEY
const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY
const AUTHOR_ID = 'c79eb5ad-de7f-45ac-a70b-2fc54f7b9cb2'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
})

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

function img(id) {
  return `https://images.unsplash.com/photo-${id}?w=1200&auto=format&fit=crop&q=80`
}

const EBOOKS = [
  {
    localPath: '/Users/jt-1of1/Downloads/career_starter_pack.pdf',
    key: 'content-files/career-starter-pack.pdf',
    title: 'The Career Starter Pack',
    slug: 'career-starter-pack',
    summary: 'A seven-step guide for landing your first real role in tech: the self-audit, your resume, your LinkedIn profile, your first portfolio, your digital footprint, your job role strategy, and how to keep improving after you apply.',
    tags: ['Career', 'Career Development'],
    coverImage: img('1522202176988-66273c2fd55f'),
    daysAgo: 0,
  },
  {
    localPath: '/Users/jt-1of1/Downloads/portfolio_template_prompt_pack.pdf',
    key: 'content-files/portfolio-template-prompt-pack.pdf',
    title: 'The Portfolio Template & Prompt Pack',
    slug: 'portfolio-template-prompt-pack',
    summary: 'A section-by-section guide to building your first portfolio, with three project types to build toward, a filled-in example, a blank template, and the AI prompts to draft it yourself.',
    tags: ['Career', 'Templates'],
    coverImage: img('1516321318423-f06f85e504b3'),
    daysAgo: 1,
  },
  {
    localPath: '/Users/jt-1of1/Downloads/linkedin_execution_doctrine.pdf',
    key: 'content-files/linkedin-execution-doctrine.pdf',
    title: 'The LinkedIn Execution Doctrine',
    slug: 'linkedin-execution-doctrine',
    summary: 'A systems manual for engineered visibility on LinkedIn: how the platform actually distributes attention, and how to build durable authority that compounds instead of chasing viral posts.',
    tags: ['Marketing', 'Career Development'],
    coverImage: img('1521737604893-d14cc237f11d'),
    daysAgo: 2,
  },
  {
    localPath: '/Users/jt-1of1/Downloads/social_media_implementation_playbook.pdf',
    key: 'content-files/social-media-implementation-playbook.pdf',
    title: 'The Social Media Implementation Playbook',
    slug: 'social-media-implementation-playbook',
    summary: 'A tactical system for social media growth: the audit path for existing brands, the setup path for new ones, and the shared strategy, production, calendar, community, analytics, and optimization system both feed into.',
    tags: ['Marketing', 'Growth'],
    coverImage: img('1552581234-26160f608093'),
    daysAgo: 3,
  },
  {
    localPath: '/Users/jt-1of1/Downloads/winning_playbook_social_media_management.pdf',
    key: 'content-files/winning-playbook-social-media-management.pdf',
    title: 'The Winning Playbook for Social Media Management',
    slug: 'winning-playbook-social-media-management',
    summary: 'A strategic reframe of social media management as a discipline rooted in psychology and community dynamics, not content scheduling, for brands that want real growth in a noisy, AI-driven world.',
    tags: ['Marketing', 'Strategy'],
    coverImage: img('1573497019940-1c28c88b4f3e'),
    daysAgo: 4,
  },
  {
    localPath: '/Users/jt-1of1/Downloads/ai_90_day_rebuild_playbook.pdf',
    key: 'content-files/90-day-ai-rebuild-playbook.pdf',
    title: 'The 90-Day AI Rebuild Playbook',
    slug: '90-day-ai-rebuild-playbook',
    summary: 'A three-phase, 90-day system for rebuilding authority, demand, and revenue from zero using AI as an intelligence and execution layer, covering positioning, content, distribution, and conversion.',
    tags: ['AI Development', 'Growth'],
    coverImage: img('1553877522-43269d4ea984'),
    daysAgo: 5,
  },
  {
    localPath: '/Users/jt-1of1/Downloads/defensible_gtm.pdf',
    key: 'content-files/building-a-defensible-go-to-market.pdf',
    title: 'Building a Defensible Go-To-Market',
    slug: 'building-a-defensible-go-to-market',
    summary: 'A first-principles guide to go-to-market strategy for founders and product leaders building in emerging and complex markets, especially across Africa, covering the structural foundations that turn traction into a durable business.',
    tags: ['Go-to-Market', 'Strategy'],
    coverImage: img('1553028826-f4804a6dba3b'),
    daysAgo: 6,
  },
  {
    localPath: '/Users/jt-1of1/Downloads/modern_gtm_operating_system.pdf',
    key: 'content-files/modern-gtm-operating-system.pdf',
    title: 'The Modern GTM Operating System',
    slug: 'modern-gtm-operating-system',
    summary: 'A structured, trust-centered framework for early-stage go-to-market execution, built around four pillars connecting visibility, belief, usage, and revenue for startups with no brand presence yet.',
    tags: ['Go-to-Market', 'Strategy'],
    coverImage: img('1590650046871-92c887180603'),
    daysAgo: 7,
  },
  {
    localPath: '/Users/jt-1of1/Downloads/invisible_product_debt.pdf',
    key: 'content-files/invisible-product-debt.pdf',
    title: 'Invisible Product Debt',
    slug: 'invisible-product-debt',
    summary: 'A field guide for product managers to identify, address, and prevent the silent accumulation of shortcuts, skipped questions, and undocumented decisions that quietly kills execution.',
    tags: ['Product Management', 'Product Development'],
    coverImage: img('1531538606174-0f90ff5dce83'),
    daysAgo: 8,
  },
  {
    localPath: '/Users/jt-1of1/Downloads/trap_of_almost_ready.pdf',
    key: 'content-files/trap-of-almost-ready.pdf',
    title: 'The Trap of Almost-Ready',
    slug: 'trap-of-almost-ready',
    summary: 'A field guide to the last mile of product delivery, examining why the final ten percent of a product takes ninety percent of the time and how teams get stuck circling instead of shipping.',
    tags: ['Product Management', 'Shipping'],
    coverImage: img('1542744173-8e7e53415bb0'),
    daysAgo: 9,
  },
  {
    localPath: '/Users/jt-1of1/Downloads/burnout_proof_pm.pdf',
    key: 'content-files/burnout-proof-product-management.pdf',
    title: 'Burnout-Proof Product Management',
    slug: 'burnout-proof-product-management',
    summary: 'A field guide to sustainable systems for product managers in high-intensity environments, covering early warning signs, boundaries, team-level leverage, and a personal operating system built around your energy.',
    tags: ['Product Management', 'Leadership'],
    coverImage: img('1573164713988-8665fc963095'),
    daysAgo: 10,
  },
]

async function verifyImage(url) {
  const res = await fetch(url, { method: 'HEAD' })
  return res.ok
}

async function run() {
  for (const e of EBOOKS) {
    if (!existsSync(e.localPath)) { console.error(`NOT FOUND: ${e.localPath}`); process.exit(1) }
  }
  console.log(`All ${EBOOKS.length} PDFs found locally.\n`)

  console.log('Verifying cover image URLs...')
  for (const e of EBOOKS) {
    const ok = await verifyImage(e.coverImage)
    console.log(`  ${ok ? 'OK' : 'BROKEN'}  ${e.slug}  ${e.coverImage}`)
    if (!ok) { console.error('Aborting — fix the broken image URL above first.'); process.exit(1) }
  }
  console.log('')

  const now = Date.now()
  for (const e of EBOOKS) {
    const body = readFileSync(e.localPath)
    await r2.send(new PutObjectCommand({
      Bucket: BUCKET, Key: e.key, Body: body,
      ContentType: 'application/pdf', ContentLength: body.byteLength,
    }))
    const fileUrl = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${e.key}`
    console.log(`UPLOADED to R2: ${e.key} (${body.byteLength} bytes)`)

    const publishedAt = new Date(now - e.daysAgo * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await sb.from('content').insert({
      title: e.title,
      slug: e.slug,
      type: 'ebook',
      status: 'published',
      summary: e.summary,
      cover_image_url: e.coverImage,
      file_url: fileUrl,
      pricing_type: 'free',
      source: 'platform',
      tags: e.tags,
      author_id: AUTHOR_ID,
      featured: false,
      published_at: publishedAt,
    })

    if (error) {
      console.error(`  DB ERROR for ${e.slug}: ${error.message}`)
      process.exit(1)
    }
    console.log(`  DB ROW created: ${e.slug} — published_at ${publishedAt}\n`)
  }

  console.log(`All ${EBOOKS.length} ebooks uploaded and published.`)
}

run().catch(err => { console.error(err); process.exit(1) })
