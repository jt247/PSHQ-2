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
    localPath: '/Users/jt-1of1/Downloads/Build-and-Deploy-with-Lovable-ProductSliceHQ.pdf',
    key: 'content-files/build-and-deploy-with-lovable.pdf',
    title: 'Build & Deploy with Lovable',
    slug: 'build-and-deploy-with-lovable',
    summary: 'A practical end-to-end guide for building, deploying, and managing AI-generated web apps — from planning your first prompt to going live with GitHub, Vercel, payments, analytics, and monitoring.',
    tags: ['AI Development', 'Product Building'],
    coverImage: img('1555066931-4365d14bab8c'),
    daysAgo: 2,
    featured: false,
  },
  {
    localPath: '/Users/jt-1of1/Downloads/Starting-Your-PM-Career-in-2026-ProductSliceHQ.pdf',
    key: 'content-files/starting-your-pm-career-in-2026.pdf',
    title: 'Starting Your Product Management Career in 2026',
    slug: 'starting-your-pm-career-in-2026',
    summary: 'A practical roadmap for breaking into product management — covering skills, AI fluency, portfolio building, your first role, networking, and a full 12-month plan.',
    tags: ['Strategy', 'Product Building'],
    coverImage: img('1552664730-d307ca884978'),
    daysAgo: 7,
    featured: true,
  },
  {
    localPath: '/Users/jt-1of1/Downloads/Starting-Your-Career-in-Product-Design-2026-ProductSliceHQ.pdf',
    key: 'content-files/starting-your-career-in-product-design-2026.pdf',
    title: 'Starting a Career in Product Design (2026 Edition)',
    slug: 'starting-your-career-in-product-design-2026',
    summary: 'For designers who want to be indispensable, not just employable. Covers the full-stack designer model, AI tools, systems thinking, working like a founder, and building a portfolio that shows thinking rather than decoration.',
    tags: ['Product Building', 'Strategy'],
    coverImage: img('1561070791-2526d30994b5'),
    daysAgo: 13,
    featured: false,
  },
  {
    localPath: '/Users/jt-1of1/Downloads/Starting-Your-Career-in-Product-Marketing-2026-ProductSliceHQ.pdf',
    key: 'content-files/starting-your-career-in-product-marketing-2026.pdf',
    title: 'Starting a Career in Product Marketing (2026 Edition)',
    slug: 'starting-your-career-in-product-marketing-2026',
    summary: 'Marketing is no longer about posting content. Covers positioning, GTM models, growth metrics, the AI marketing stack, and how to build a real marketing career that compounds.',
    tags: ['Strategy', 'Product Building'],
    coverImage: img('1533750349088-cd871a92f312'),
    daysAgo: 18,
    featured: false,
  },
  {
    localPath: '/Users/jt-1of1/Downloads/Starting-Your-Career-in-AI-Project-and-Operations-Management-2026-ProductSliceHQ.pdf',
    key: 'content-files/starting-your-career-in-ai-project-operations-management-2026.pdf',
    title: 'Starting a Career in AI Project & Operations Management (2026 Edition)',
    slug: 'starting-your-career-in-ai-project-operations-management-2026',
    summary: 'The future belongs to people who can coordinate people, AI agents, systems, and execution. Covers delivery frameworks, the expanded operations skill set, automation design, and the path to AI Operations Manager and Chief of Staff.',
    tags: ['AI Development', 'Product Building'],
    coverImage: img('1454165804606-c3d57bc86b40'),
    daysAgo: 23,
    featured: false,
  },
  {
    localPath: '/Users/jt-1of1/Downloads/Starting-Your-Career-in-AI-Native-Software-Engineering-2026-ProductSliceHQ.pdf',
    key: 'content-files/starting-your-career-in-ai-native-software-engineering-2026.pdf',
    title: 'Starting a Career in AI-Native Software Engineering (2026 Edition)',
    slug: 'starting-your-career-in-ai-native-software-engineering-2026',
    summary: 'How to build, ship, and scale software in the age of AI — covering product engineering, AI development workflow, deployment, infrastructure, open source, and a 5-year growth roadmap.',
    tags: ['AI Development', 'Product Building'],
    coverImage: img('1517694712202-14dd9538aa97'),
    daysAgo: 27,
    featured: true,
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
  console.log('All 6 PDFs found locally.\n')

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
      featured: e.featured,
      published_at: publishedAt,
    })

    if (error) {
      console.error(`  DB ERROR for ${e.slug}: ${error.message}`)
      process.exit(1)
    }
    console.log(`  DB ROW created: ${e.slug} — published_at ${publishedAt} — featured: ${e.featured}\n`)
  }

  console.log('All 6 ebooks uploaded and published.')
}

run().catch(err => { console.error(err); process.exit(1) })
