import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadFileToR2, type UploadFolder } from '@/lib/r2/upload'

const MAX_THUMBNAIL_MB = 5
const MAX_FILE_MB = 100

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const folder = (formData.get('folder') as UploadFolder | null) ?? 'content-files'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const maxBytes = folder === 'thumbnails' ? MAX_THUMBNAIL_MB * 1024 * 1024 : MAX_FILE_MB * 1024 * 1024
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large. Max ${folder === 'thumbnails' ? MAX_THUMBNAIL_MB : MAX_FILE_MB}MB.` },
      { status: 413 }
    )
  }

  const { key, url } = await uploadFileToR2(file, folder)
  return NextResponse.json({ key, url })
}
