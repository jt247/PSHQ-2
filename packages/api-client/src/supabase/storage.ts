import { randomUUID } from 'crypto'
import { createServiceClient } from './server'

// Public image storage.
//
// R2 is the right home for gated downloads (ebooks, templates) because those
// are served through signed requests via /api/download. It is the wrong home
// for images that must render directly in an <img>: the bucket is private, so
// a raw r2.cloudflarestorage.com URL returns 400 to a browser. Support ticket
// attachments stored that way uploaded successfully and then displayed as a
// broken image every time.
//
// This bucket is already public and already serves every article cover on the
// site, so images written here render with no extra configuration.
const PUBLIC_IMAGE_BUCKET = 'content-images'

export async function uploadPublicImage(
  file: File,
  folder: string,
): Promise<{ path: string; url: string }> {
  const ext = (file.name.match(/\.[^.]+$/)?.[0] ?? '.jpg').toLowerCase()
  const path = `${folder}/${randomUUID()}${ext}`

  const supabase = createServiceClient()
  const { error } = await supabase.storage
    .from(PUBLIC_IMAGE_BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })

  if (error) throw new Error(`Image upload failed: ${error.message}`)

  const { data } = supabase.storage.from(PUBLIC_IMAGE_BUCKET).getPublicUrl(path)
  return { path, url: data.publicUrl }
}
