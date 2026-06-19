const R2_BASE = `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

export const r2 = {
  bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
  baseUrl: R2_BASE,
  accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID!,
  accessKey: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
  secretKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
}
