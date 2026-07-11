import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadFileToR2, type UploadFolder } from '@/lib/r2/upload'

const MAX_THUMBNAIL_MB = 5
const MAX_FILE_MB = 100

const FOLDERS: UploadFolder[] = ['thumbnails', 'content-files', 'case-library-files', 'case-library-thumbnails']

// Allowed extensions per folder class. Images for thumbnails, documents for files.
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']
const FILE_EXT  = ['.pdf', '.xlsx', '.xls', '.csv', '.docx', '.pptx', '.zip', ...IMAGE_EXT]

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Uploads are admin-only — this route is called from admin forms exclusively.
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const folder = (formData.get('folder') as UploadFolder | null) ?? 'content-files'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!FOLDERS.includes(folder)) {
    return NextResponse.json({ error: 'Invalid folder' }, { status: 400 })
  }

  const isThumbnail = folder === 'thumbnails' || folder === 'case-library-thumbnails'
  const allowedExt = isThumbnail ? IMAGE_EXT : FILE_EXT
  const ext = (file.name.match(/\.[^.]+$/)?.[0] ?? '').toLowerCase()
  if (!allowedExt.includes(ext)) {
    return NextResponse.json(
      { error: `File type not allowed. Accepted: ${allowedExt.join(', ')}` },
      { status: 415 }
    )
  }

  const maxBytes = isThumbnail ? MAX_THUMBNAIL_MB * 1024 * 1024 : MAX_FILE_MB * 1024 * 1024
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large. Max ${isThumbnail ? MAX_THUMBNAIL_MB : MAX_FILE_MB}MB.` },
      { status: 413 }
    )
  }

  const { key, url } = await uploadFileToR2(file, folder)
  return NextResponse.json({ key, url })
}
