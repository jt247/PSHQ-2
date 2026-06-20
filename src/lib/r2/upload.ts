import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import path from 'path'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
})

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!
// Set CLOUDFLARE_R2_PUBLIC_URL to your R2 public bucket domain or custom domain.
// e.g. https://pub-xxxx.r2.dev  or  https://assets.yourdomain.com
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL ?? ''

export type UploadFolder = 'thumbnails' | 'content-files' | 'case-library-files' | 'case-library-thumbnails'

export async function uploadFileToR2(
  file: File,
  folder: UploadFolder
): Promise<{ key: string; url: string }> {
  const ext = path.extname(file.name) || ''
  const key = `${folder}/${randomUUID()}${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
      ContentLength: buffer.byteLength,
    })
  )

  const url = PUBLIC_URL
    ? `${PUBLIC_URL}/${key}`
    : `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${key}`

  return { key, url }
}

export async function deleteFileFromR2(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
