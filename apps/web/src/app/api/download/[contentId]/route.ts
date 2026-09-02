import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { isOnboarded } from '@pshq/api-client/onboarding'
import { trackResourceDownloaded } from '@pshq/analytics'

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

// Object keys are <folder>/<filename>. Filenames come from either the upload
// route (randomUUID + ext) or admin scripts (human-readable slug + ext) —
// both are legitimate, so this only blocks path traversal and enforces the
// folder/filename shape rather than requiring UUID naming.
const KEY_RE = /^[a-z0-9-]+\/[A-Za-z0-9._-]+$/

function extractKey(fileUrl: string): string | null {
  // Strip the R2 endpoint prefix to get the object key
  const prefix = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/`
  const key = fileUrl.startsWith(prefix) ? fileUrl.slice(prefix.length) : fileUrl
  if (key.includes('..') || key.includes('//')) return null
  return KEY_RE.test(key) ? key : null
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

  // Downloads are gated behind completed onboarding (Epic A.3) — the UI
  // already hides this behind a "complete your profile" CTA, this is the
  // enforcement so hitting the route URL directly can't skip that.
  if (!(await isOnboarded(supabase, user.id))) {
    return NextResponse.json({ error: 'Complete onboarding to download resources.' }, { status: 403 })
  }

  const { data: content, error } = await supabase
    .from('content')
    .select('id, slug, title, file_url, pricing_type, status')
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

  await trackResourceDownloaded({ supabase, source: 'web', userId: user.id }, { contentId })

  // Generate a presigned URL valid for 1 hour. ResponseContentDisposition
  // forces a real save-to-disk on this path — without it, R2 returns
  // whatever disposition the object was uploaded with (typically none),
  // which most browsers then open inline instead of downloading. That made
  // "download" and "view" indistinguishable; this override, plus /api/view
  // serving the read path separately, is what actually splits the two.
  const key = extractKey(fileUrl)
  if (!key) {
    return NextResponse.json({ error: 'Invalid file reference' }, { status: 404 })
  }
  const ext = key.match(/\.[^./]+$/)?.[0] ?? '.pdf'
  const filename = `${(content.slug as string) || 'download'}${ext}`
  const signedUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    }),
    { expiresIn: 3600 }
  )

  return NextResponse.redirect(signedUrl)
}
