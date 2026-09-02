'use client'

import { useState, useTransition } from 'react'

interface CollectionData {
  id?: string
  title?: string
  slug?: string
  description?: string | null
  cover_image_url?: string | null
}

export function CollectionForm({ collection, action }: { collection?: CollectionData; action: (formData: FormData) => Promise<void> }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState(collection?.cover_image_url ?? '')
  const [uploading, setUploading] = useState(false)

  async function handleThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'collection-covers')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setCoverUrl(json.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('cover_image_url', coverUrl)
    startTransition(async () => {
      try { await action(fd) } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="content-form">
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="title">Title *</label>
          <input id="title" name="title" required defaultValue={collection?.title ?? ''} />
        </div>
        <div className="form-field">
          <label htmlFor="slug">Slug</label>
          <input id="slug" name="slug" defaultValue={collection?.slug ?? ''} placeholder="auto from title if blank" />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} defaultValue={collection?.description ?? ''} />
      </div>

      <div className="form-field">
        <label>Cover image</label>
        {coverUrl && <img src={coverUrl} alt="cover preview" className="thumb-preview" />}
        <input type="file" accept="image/*" disabled={uploading} onChange={handleThumb} />
        {uploading && <span className="uploading-label">Uploading…</span>}
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isPending || uploading} className="btn-primary">
          {isPending ? 'Saving…' : collection?.id ? 'Save changes' : 'Create collection'}
        </button>
      </div>
    </form>
  )
}
