// Run after updating .env.local with a working R2 API token:
//   node scripts/upload-courses.mjs
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync, existsSync } from 'fs'

const envPath = new URL('../.env.local', import.meta.url).pathname
const env = readFileSync(envPath, 'utf-8')
const envVars = Object.fromEntries(
  env.split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const ACCOUNT_ID = envVars.CLOUDFLARE_R2_ACCOUNT_ID
const BUCKET = envVars.CLOUDFLARE_R2_BUCKET_NAME
const ACCESS_KEY = envVars.CLOUDFLARE_R2_ACCESS_KEY
const SECRET_KEY = envVars.CLOUDFLARE_R2_SECRET_KEY
const PUBLIC_URL = envVars.CLOUDFLARE_R2_PUBLIC_URL ?? ''

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
})

const COURSES = [
  {
    localPath: '/Users/jt-1of1/Downloads/course-ai-product-development.png',
    key: 'thumbnails/course-ai-product-development.png',
    slug: 'ai-assisted-product-development-from-idea-to-launch',
    placeholder: 'PLACEHOLDER_COURSE_AI_PRODUCT_DEV',
  },
  {
    localPath: '/Users/jt-1of1/Downloads/course-ai-coding-stack.png',
    key: 'thumbnails/course-ai-coding-stack.png',
    slug: 'mastering-your-ai-coding-stack',
    placeholder: 'PLACEHOLDER_COURSE_AI_CODING_STACK',
  },
  {
    localPath: '/Users/jt-1of1/Downloads/course-architecture-security.png',
    key: 'thumbnails/course-architecture-security.png',
    slug: 'architecture-and-security-for-vibe-coded-products',
    placeholder: 'PLACEHOLDER_COURSE_ARCHITECTURE_SECURITY',
  },
]

for (const course of COURSES) {
  if (!existsSync(course.localPath)) {
    console.error(`NOT FOUND: ${course.localPath}`)
    process.exit(1)
  }
  const body = readFileSync(course.localPath)
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: course.key,
    Body: body,
    ContentType: 'image/png',
    ContentLength: body.byteLength,
  }))
  const url = PUBLIC_URL ? `${PUBLIC_URL}/${course.key}` : `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${course.key}`
  console.log(`UPLOADED: ${course.key}`)
  console.log(`  URL: ${url}`)
  console.log(`  SQL: UPDATE content SET cover_image_url = '${url}' WHERE slug = '${course.slug}';`)
  console.log('')
}

console.log('Done. Copy the SQL statements above and run them in Supabase to replace placeholder URLs.')
