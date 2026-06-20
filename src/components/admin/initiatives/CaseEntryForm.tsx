'use client'

import { useState, useTransition } from 'react'

interface FileRow { url: string; label: string; type: string }

interface EntryData {
  id?: string
  title?: string
  company_name?: string
  description?: string | null
  thumbnail_url?: string | null
  tags?: string[]
  status?: string
  files?: { id?: string; file_url: string; file_label: string | null; file_type: string | null }[]
}

interface Props {
  entry?: EntryData
  action: (formData: FormData) => Promise<void>
  backHref: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.625rem', fontSize: '0.875rem',
  border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem',
}

async function uploadFile(file: File, folder: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('folder', folder)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Upload failed')
  }
  const { url } = await res.json()
  return url
}

export function CaseEntryForm({ entry, action, backHref }: Props) {
  const [isPending, startTransition] = useTransition()
  const [thumbUrl, setThumbUrl] = useState<string>(entry?.thumbnail_url ?? '')
  const [thumbUploading, setThumbUploading] = useState(false)
  const [fileRows, setFileRows] = useState<FileRow[]>(
    (entry?.files ?? []).map(f => ({ url: f.file_url, label: f.file_label ?? '', type: f.file_type ?? '' }))
  )
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleThumbChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbUploading(true)
    try {
      const url = await uploadFile(file, 'case-library-thumbnails')
      setThumbUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thumbnail upload failed')
    } finally {
      setThumbUploading(false)
    }
  }

  function addFileRow() {
    setFileRows(prev => [...prev, { url: '', label: '', type: '' }])
  }

  function removeFileRow(idx: number) {
    setFileRows(prev => prev.filter((_, i) => i !== idx))
  }

  function updateFileRow(idx: number, field: keyof FileRow, val: string) {
    setFileRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  async function handleFileUpload(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingIdx(idx)
    try {
      const url = await uploadFile(file, 'case-library-files')
      updateFileRow(idx, 'url', url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed')
    } finally {
      setUploadingIdx(null)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('thumbnail_url', thumbUrl)
    fd.set('files', JSON.stringify(fileRows.filter(r => r.url)))
    startTransition(() => action(fd))
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '680px' }}>
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.875rem', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Title + company */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Title *</label>
          <input name="title" required defaultValue={entry?.title ?? ''} placeholder="e.g. Paystack Product Teardown" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Company name *</label>
          <input name="company_name" required defaultValue={entry?.company_name ?? ''} placeholder="e.g. Paystack" style={inputStyle} />
        </div>
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>Description</label>
        <textarea name="description" rows={3} defaultValue={entry?.description ?? ''} placeholder="Short summary of this case study…" style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* Tags */}
      <div>
        <label style={labelStyle}>Tags <span style={{ fontWeight: 400, color: '#9ca3af' }}>(comma-separated)</span></label>
        <input name="tags" defaultValue={(entry?.tags ?? []).join(', ')} placeholder="e.g. fintech, growth, africa" style={inputStyle} />
      </div>

      {/* Status */}
      <div>
        <label style={labelStyle}>Status *</label>
        <select name="status" required defaultValue={entry?.status ?? 'draft'} style={{ ...inputStyle, maxWidth: '220px' }}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      {/* Thumbnail */}
      <div>
        <label style={labelStyle}>Thumbnail</label>
        {thumbUrl && (
          <div style={{ marginBottom: '0.5rem' }}>
            <img src={thumbUrl} alt="Thumbnail" style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '0.25rem', border: '1px solid #e5e7eb' }} />
          </div>
        )}
        <input type="file" accept="image/*" onChange={handleThumbChange} style={{ fontSize: '0.8125rem' }} />
        {thumbUploading && <span style={{ marginLeft: '0.5rem', fontSize: '0.8125rem', color: '#6b7280' }}>Uploading…</span>}
      </div>

      {/* File attachments */}
      <div>
        <label style={labelStyle}>File attachments</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.5rem' }}>
          {fileRows.map((row, idx) => (
            <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.75rem', background: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                <div>
                  <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Label</label>
                  <input
                    value={row.label}
                    onChange={e => updateFileRow(idx, 'label', e.target.value)}
                    placeholder="e.g. Full Teardown PDF"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>File type</label>
                  <input
                    value={row.type}
                    onChange={e => updateFileRow(idx, 'type', e.target.value)}
                    placeholder="e.g. pdf, slides"
                    style={inputStyle}
                  />
                </div>
                <button type="button" onClick={() => removeFileRow(idx)} style={{
                  background: 'none', border: '1px solid #e5e7eb', borderRadius: '0.25rem',
                  width: '2rem', height: '2rem', cursor: 'pointer', color: '#9ca3af', fontSize: '1rem',
                }} aria-label="Remove file">×</button>
              </div>

              {/* File picker row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input type="file" onChange={e => handleFileUpload(idx, e)} style={{ fontSize: '0.8125rem', flex: 1 }} />
                {uploadingIdx === idx && <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>Uploading…</span>}
              </div>

              {row.url && !row.url.startsWith('placeholder://') && (
                <div style={{ fontSize: '0.75rem', color: '#10b981', wordBreak: 'break-all' }}>
                  ✓ Uploaded: {row.url.split('/').pop()}
                </div>
              )}
              {row.url && row.url.startsWith('placeholder://') && (
                <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>
                  ⚠ Placeholder URL — upload a file to replace it
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addFileRow} className="btn-ghost" style={{ fontSize: '0.8125rem', padding: '0.3125rem 0.75rem' }}>
          + Add file attachment
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' }}>
        <button type="submit" className="btn-primary" disabled={isPending || thumbUploading || uploadingIdx !== null}>
          {isPending ? 'Saving…' : entry?.id ? 'Save changes' : 'Create entry'}
        </button>
        <a href={backHref} className="btn-ghost">Cancel</a>
      </div>
    </form>
  )
}
