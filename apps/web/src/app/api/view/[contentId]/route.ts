import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { createClient, createServiceClient } from '@pshq/api-client/server'
import { isOnboarded } from '@pshq/api-client/onboarding'
import { renderSpreadsheetAsHtml } from '@/lib/spreadsheet-viewer'
import { isViewableInline } from '@/lib/viewable'
import { trackReaderOpened } from '@pshq/analytics'

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

// Same key shape as /api/download — kept in sync with that route.
const KEY_RE = /^[a-z0-9-]+\/[A-Za-z0-9._-]+$/

function extractKey(fileUrl: string): string | null {
  const prefix = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/`
  const key = fileUrl.startsWith(prefix) ? fileUrl.slice(prefix.length) : fileUrl
  if (key.includes('..') || key.includes('//')) return null
  return KEY_RE.test(key) ? key : null
}

// Serves the file inline through our own origin instead of redirecting to a
// signed R2 URL. Two reasons: an iframe pointed at a cross-origin R2 URL
// would be blocked by our CSP (frame-src isn't set, so it falls back to
// default-src 'self'), and this way the client never sees a signed URL for
// the "read" path at all — only /api/download hands one out, and only for
// an explicit save-to-disk.
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

  // Reading ebooks/templates inline is gated behind completed onboarding
  // (Epic A.3), same as downloads. This route only ever serves those two
  // types — see isViewableInline usage in content/[slug]/read/page.tsx.
  if (!(await isOnboarded(supabase, user.id))) {
    return NextResponse.json({ error: 'Complete onboarding to view this content.' }, { status: 403 })
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

  // PDFs stream as-is (the browser renders them natively). Spreadsheets get
  // parsed and rendered as read-only HTML tables — see spreadsheet-viewer.ts
  // for why that beats converting to PDF or embedding a third-party viewer.
  if (!isViewableInline(fileUrl)) {
    return NextResponse.json({ error: 'This file type cannot be viewed inline. Use the download link instead.' }, { status: 415 })
  }
  const isSpreadsheet = fileUrl.toLowerCase().endsWith('.xlsx') || fileUrl.toLowerCase().endsWith('.xls')

  const key = extractKey(fileUrl)
  if (!key) {
    return NextResponse.json({ error: 'Invalid file reference' }, { status: 404 })
  }

  // Log the view AND a distinct 'read' event (non-fatal). Written via the
  // service client — the sync_view_count trigger's internal update on
  // `content` is blocked by RLS when the triggering insert runs as a normal
  // authenticated user, so going through the RLS-bound client here would
  // silently never move view_count. Same fix as the upvote/comment insert
  // paths. 'read' is additive — the trigger only fires on type='view', so
  // this can't change what view_count means; it's purely a more specific
  // "opened the reader" signal alongside the existing page-visit view.
  //
  // Two separate inserts, not one batch — 'read' is a new enum value
  // (migration 20260827000021) that may not exist in this database yet. A
  // multi-row insert is one statement: if 'read' is rejected, Postgres
  // fails the entire insert, taking the 'view' row down with it. Keeping
  // them separate means view tracking keeps working regardless of whether
  // that migration has run.
  const service = createServiceClient()
  try {
    await service.from('content_interactions').insert({ content_id: contentId, user_id: user.id, type: 'view', metadata: {} })
  } catch { /* non-fatal */ }
  try {
    await service.from('content_interactions').insert({ content_id: contentId, user_id: user.id, type: 'read', metadata: {} })
  } catch { /* non-fatal — reports as 0 reads until the migration adding this enum value runs */ }
  await trackReaderOpened({ supabase, source: 'web', userId: user.id }, { contentId })

  const object = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const bytes = await object.Body!.transformToByteArray()

  if (isSpreadsheet) {
    const html = renderSpreadsheetAsHtml(bytes, content.title as string)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    })
  }

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': object.ContentType ?? 'application/pdf',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  })
}
