'use client'

import { useState, useTransition } from 'react'
import { updateContentAction } from '@/app/admin/content/actions'

type ContentType = 'article' | 'ebook' | 'template' | 'course'

interface ContentFormProps {
  mode: 'create' | 'edit'
  id?: string
  defaultValues?: {
    title?: string
    slug?: string
    type?: ContentType
    summary?: string
    body?: string
    cover_image_url?: string
    file_url?: string
    tags?: string[]
    pricing_type?: 'free' | 'paid'
    price_amount?: number | null
    currency?: string
  }
  createAction?: (formData: FormData) => Promise<void>
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function ContentForm({ mode, id, defaultValues = {}, createAction }: ContentFormProps) {
  const [title, setTitle]         = useState(defaultValues.title ?? '')
  const [slug, setSlug]           = useState(defaultValues.slug ?? '')
  const [slugEdited, setSlugEdited] = useState(!!defaultValues.slug)
  const [type, setType]           = useState<ContentType>(defaultValues.type ?? 'article')
  const [pricingType, setPricing] = useState(defaultValues.pricing_type ?? 'free')
  const [coverUrl, setCoverUrl]   = useState(defaultValues.cover_image_url ?? '')
  const [fileUrl, setFileUrl]     = useState(defaultValues.file_url ?? '')
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [uploadingFile, setUploadingFile]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setTitle(v)
    if (!slugEdited) setSlug(slugify(v))
  }

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    folder: 'thumbnails' | 'content-files',
    setter: (url: string) => void,
    setLoading: (b: boolean) => void
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', folder)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setter(json.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    // Inject file URLs (state-managed, not standard inputs)
    fd.set('cover_image_url', coverUrl)
    fd.set('file_url', fileUrl)

    startTransition(async () => {
      try {
        if (mode === 'create' && createAction) {
          await createAction(fd)
        } else if (mode === 'edit' && id) {
          await updateContentAction(id, fd)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const needsFile = type === 'ebook' || type === 'template' || type === 'course'

  return (
    <form onSubmit={handleSubmit} className="content-form">
      {error && <p className="form-error" role="alert">{error}</p>}

      {/* Title + Slug */}
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="title">Title *</label>
          <input
            id="title" name="title" type="text" required
            value={title} onChange={handleTitleChange}
          />
        </div>
        <div className="form-field">
          <label htmlFor="slug">Slug *</label>
          <input
            id="slug" name="slug" type="text" required
            value={slug}
            onChange={e => { setSlug(e.target.value); setSlugEdited(true) }}
          />
        </div>
      </div>

      {/* Type + Pricing */}
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="type">Type *</label>
          <select id="type" name="type" value={type} onChange={e => setType(e.target.value as ContentType)} required>
            <option value="article">Article</option>
            <option value="ebook">Ebook</option>
            <option value="template">Template</option>
            <option value="course">Course</option>
          </select>
        </div>
        <div className="form-field">
          <label>Pricing</label>
          <div className="radio-row">
            <label className="radio-label">
              <input type="radio" name="pricing_type" value="free" checked={pricingType === 'free'} onChange={() => setPricing('free')} />
              Free
            </label>
            <label className="radio-label">
              <input type="radio" name="pricing_type" value="paid" checked={pricingType === 'paid'} onChange={() => setPricing('paid')} />
              Paid
            </label>
          </div>
        </div>
      </div>

      {/* Price fields — only when paid */}
      {pricingType === 'paid' && (
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="price_amount">Price (in smallest unit, e.g. kobo) *</label>
            <input
              id="price_amount" name="price_amount" type="number" min="1" required
              defaultValue={defaultValues.price_amount ?? ''}
              placeholder="e.g. 500000 = ₦5,000"
            />
          </div>
          <div className="form-field">
            <label htmlFor="currency">Currency</label>
            <input id="currency" name="currency" type="text" defaultValue={defaultValues.currency ?? 'NGN'} />
          </div>
        </div>
      )}

      {/* Summary / Description */}
      <div className="form-field">
        <label htmlFor="summary">Description / Summary</label>
        <textarea id="summary" name="summary" rows={3} defaultValue={defaultValues.summary ?? ''} />
      </div>

      {/* Body — articles only */}
      {type === 'article' && (
        <div className="form-field">
          <label htmlFor="body">Body (Markdown)</label>
          <textarea id="body" name="body" rows={18} className="body-editor" defaultValue={defaultValues.body ?? ''} placeholder="Write in Markdown..." />
        </div>
      )}

      {/* Tags */}
      <div className="form-field">
        <label htmlFor="tags">Tags <span className="hint">(comma-separated)</span></label>
        <input id="tags" name="tags" type="text" defaultValue={defaultValues.tags?.join(', ') ?? ''} placeholder="e.g. strategy, product management" />
      </div>

      {/* Thumbnail upload */}
      <div className="form-field">
        <label>Thumbnail</label>
        {coverUrl && <img src={coverUrl} alt="thumbnail preview" className="thumb-preview" />}
        <input
          type="file" accept="image/*" disabled={uploadingThumb}
          onChange={e => handleFileUpload(e, 'thumbnails', setCoverUrl, setUploadingThumb)}
        />
        {uploadingThumb && <span className="uploading-label">Uploading…</span>}
        {coverUrl && <input type="hidden" name="cover_image_url" value={coverUrl} />}
      </div>

      {/* File upload — ebook / template / course */}
      {needsFile && (
        <div className="form-field">
          <label>Content File (PDF, ZIP, etc.)</label>
          {fileUrl && <p className="file-link"><a href={fileUrl} target="_blank" rel="noreferrer">Current file ↗</a></p>}
          <input
            type="file" disabled={uploadingFile}
            onChange={e => handleFileUpload(e, 'content-files', setFileUrl, setUploadingFile)}
          />
          {uploadingFile && <span className="uploading-label">Uploading…</span>}
          {fileUrl && <input type="hidden" name="file_url" value={fileUrl} />}
        </div>
      )}

      <div className="form-actions">
        <button type="submit" disabled={isPending || uploadingThumb || uploadingFile} className="btn-primary">
          {isPending ? 'Saving…' : mode === 'create' ? 'Create (save as draft)' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
