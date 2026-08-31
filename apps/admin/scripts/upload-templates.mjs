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

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
})

const TEMPLATES = [
  {
    localPath: '/Users/jt-1of1/Downloads/The-OCP-SPARK-Builders-Canvas-ProductSliceHQ.pdf',
    key: 'content-files/the-ocp-spark-builders-canvas.pdf',
    slug: 'the-ocp-spark-builders-canvas',
  },
  {
    localPath: '/Users/jt-1of1/Downloads/The-Solo-Builders-Claude-Code-Setup-Guide-ProductSliceHQ.pdf',
    key: 'content-files/the-solo-builders-claude-code-setup-guide.pdf',
    slug: 'the-solo-builders-claude-code-setup-guide',
  },
  {
    localPath: '/Users/jt-1of1/Downloads/The-AI-Project-Folder-Structure-Template-ProductSliceHQ.pdf',
    key: 'content-files/the-ai-project-folder-structure-template.pdf',
    slug: 'the-ai-project-folder-structure-template',
  },
]

for (const t of TEMPLATES) {
  if (!existsSync(t.localPath)) { console.error(`NOT FOUND: ${t.localPath}`); process.exit(1) }
  const body = readFileSync(t.localPath)
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET, Key: t.key, Body: body,
    ContentType: 'application/pdf', ContentLength: body.byteLength,
  }))
  const url = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${t.key}`
  console.log(`UPLOADED: ${t.key}`)
  console.log(`  URL: ${url}`)
  console.log(`  slug: ${t.slug}`)
  console.log('')
}
console.log('Done.')
