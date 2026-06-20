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

function extractKey(fileUrl: string): string | null {
  const prefix = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/`
  if (fileUrl.startsWith(prefix)) return fileUrl.slice(prefix.length)
  if (fileUrl.startsWith('placeholder://')) return null
  return fileUrl
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params
  const service = createServiceClient()

  const { data: file, error } = await service
    .from('case_library_files')
    .select(`
      id, file_url, file_label,
      case_library_entries!inner (id, status)
    `)
    .eq('id', fileId)
    .eq('case_library_entries.status', 'published')
    .single()

  if (error || !file) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const entry = (file as unknown as { case_library_entries: { id: string; status: string } }).case_library_entries
  const fileUrl = file.file_url as string

  // Log the download — non-fatal, user optional
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await service.from('case_library_interactions').insert({
      file_id: file.id,
      entry_id: entry.id,
      user_id: user?.id ?? null,
      type: 'download',
      metadata: { file_label: file.file_label },
    })
  } catch { /* non-fatal */ }

  const key = extractKey(fileUrl)

  if (!key) {
    return NextResponse.json(
      { error: 'File not yet available — this is a placeholder entry.' },
      { status: 404 }
    )
  }

  const signedUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 }
  )

  return NextResponse.redirect(signedUrl)
}
