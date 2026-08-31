import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

// Load .env.local manually
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

const EBOOKS = [
  {
    localPath: '/Users/jt-1of1/Downloads/Choosing-Your-AI-Development-Stack-ProductSliceHQ.pdf',
    key: 'content-files/choosing-your-ai-development-stack.pdf',
  },
  {
    localPath: '/Users/jt-1of1/Downloads/From-One-Customer-to-Shipped-Product-ProductSliceHQ.pdf',
    key: 'content-files/from-one-customer-to-shipped-product.pdf',
  },
  {
    localPath: '/Users/jt-1of1/Downloads/The-Vibe-Coders-Architecture-Playbook-ProductSliceHQ.pdf',
    key: 'content-files/the-vibe-coders-architecture-playbook.pdf',
  },
]

for (const ebook of EBOOKS) {
  if (!existsSync(ebook.localPath)) {
    console.error(`NOT FOUND: ${ebook.localPath}`)
    process.exit(1)
  }
  const body = readFileSync(ebook.localPath)
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: ebook.key,
    Body: body,
    ContentType: 'application/pdf',
    ContentLength: body.byteLength,
  }))
  console.log(`UPLOADED: ${ebook.key} (${body.byteLength} bytes)`)
}

console.log('\nAll uploads complete. Keys:')
EBOOKS.forEach(e => console.log(' ', e.key))
