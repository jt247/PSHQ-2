import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
})

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!
const ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID!

function extractKey(fileUrl: string): string {
  // Strip the R2 endpoint prefix to get the object key
  const prefix = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/`
  if (fileUrl.startsWith(prefix)) return fileUrl.slice(prefix.length)
  // Fallback: treat as key directly
  return fileUrl
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  const { contentId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: content, error } = await supabase
    .from('content')
    .select('id, title, file_url, pricing_type, status')
    .eq('id', contentId)
    .eq('status', 'published')
    .single()

  if (error || !content) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (content.pricing_type !== 'free') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const fileUrl = content.file_url as string | null
  if (!fileUrl) {
    return NextResponse.json({ error: 'No file available' }, { status: 404 })
  }

  // Log the download interaction (non-fatal)
  try {
    const service = createServiceClient()
    await service.from('content_interactions').insert({
      content_id: contentId,
      user_id: user.id,
      type: 'download',
      metadata: {},
    })
  } catch { /* non-fatal */ }

  // Generate a presigned URL valid for 1 hour
  const key = extractKey(fileUrl)
  const signedUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 }
  )

  return NextResponse.redirect(signedUrl)
}
