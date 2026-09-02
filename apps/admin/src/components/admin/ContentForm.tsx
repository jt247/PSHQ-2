'use client'

import { useState, useTransition } from 'react'
import { updateContentAction } from '@/app/content/actions'

type ContentType = 'article' | 'ebook' | 'template' | 'course' | 'guide' | 'build_note'

interface LookupOption { id: string; name?: string; title?: string }

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
    selar_url?: string | null
    status?: 'draft' | 'published' | 'archived'
    // Epic G §G.5 shared metadata
    domain?: string
    level?: string
    resource_category?: string
    estimated_time_minutes?: number
    resource_intent?: string[]
    seo_title?: string
    seo_description?: string
    canonical_url?: string
    og_image_url?: string
    series_id?: string
    topic_ids?: string[]
    goal_ids?: string[]
    role_ids?: string[]
  }
  createAction?: (formData: FormData) => Promise<void>
  topics?: LookupOption[]
  goals?: LookupOption[]
  roles?: LookupOption[]
  series?: LookupOption[]
}

const DOMAINS = ['product', 'growth', 'ai', 'building', 'careers', 'leadership']
const LEVELS = ['exploring', 'beginner', 'intermediate', 'senior', 'leader']
const INTENTS = ['Learn', 'Build', 'Plan', 'Evaluate', 'Practice', 'Prepare', 'Get hired', 'Lead', 'Grow']

const CONTENT_TAGS = [
  'Strategy', 'Roadmapping', 'Prioritization', 'Discovery', 'User Research',
  'Analytics', 'Metrics', 'OKRs', 'Growth', 'Go-to-Market', 'Pricing',
  'Stakeholder Management', 'Leadership', 'Career', 'Product Design', 'Engineering',
  'Data', 'AI/ML', 'Fintech', 'Healthtech', 'Edtech', 'Agritech', 'B2B', 'B2C',
  'Startup', 'Enterprise', 'Case Study', 'Framework', 'Africa', 'Community',
]

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function ContentForm({ mode, id, defaultValues = {}, createAction, topics = [], goals = [], roles = [], series = [] }: ContentFormProps) {
  const [title, setTitle]         = useState(defaultValues.title ?? '')
  const [slug, setSlug]           = useState(defaultValues.slug ?? '')
  const [slugEdited, setSlugEdited] = useState(!!defaultValues.slug)
  const [type, setType]           = useState<ContentType>(defaultValues.type ?? 'article')
  const [pricingType, setPricing] = useState(defaultValues.pricing_type ?? 'free')
  const [coverUrl, setCoverUrl]   = useState(defaultValues.cover_image_url ?? '')
  const [fileUrl, setFileUrl]     = useState(defaultValues.file_url ?? '')
  const [ogImageUrl, setOgImageUrl] = useState(defaultValues.og_image_url ?? '')
  const [uploadingOg, setUploadingOg] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>(defaultValues.tags ?? [])
  const [selectedIntents, setSelectedIntents] = useState<string[]>(defaultValues.resource_intent ?? [])
  const [selectedTopics, setSelectedTopics] = useState<string[]>(defaultValues.topic_ids ?? [])
  const [selectedGoals, setSelectedGoals] = useState<string[]>(defaultValues.goal_ids ?? [])
  const [selectedRoles, setSelectedRoles] = useState<string[]>(defaultValues.role_ids ?? [])
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [uploadingFile, setUploadingFile]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [pendingIntent, setPendingIntent] = useState<'draft' | 'publish' | null>(null)

  function toggleFrom(list: string[], setList: (v: string[]) => void, val: string) {
    setList(list.includes(val) ? list.filter(v => v !== val) : [...list, val])
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setTitle(v)
    if (!slugEdited) setSlug(slugify(v))
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
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

  function handleSubmit(intent: 'draft' | 'publish') {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(null)
      setPendingIntent(intent)
      const fd = new FormData(e.currentTarget)
      fd.set('cover_image_url', coverUrl)
      fd.set('file_url', fileUrl)
      fd.set('og_image_url', ogImageUrl)
      fd.set('tags', selectedTags.join(','))
      fd.set('intent', intent)
      selectedIntents.forEach(v => fd.append('resource_intent', v))
      selectedTopics.forEach(v => fd.append('topic_ids', v))
      selectedGoals.forEach(v => fd.append('goal_ids', v))
      selectedRoles.forEach(v => fd.append('role_ids', v))

      startTransition(async () => {
        try {
          if (mode === 'create' && createAction) {
            await createAction(fd)
          } else if (mode === 'edit' && id) {
            await updateContentAction(id, fd)
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
          setPendingIntent(null)
        }
      })
    }
  }

  const needsFile = type === 'ebook' || type === 'template'
  const isCourse  = type === 'course'

  return (
    <form onSubmit={handleSubmit('draft')} className="content-form">
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
            <option value="guide">Guide</option>
            <option value="build_note">Build Note</option>
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

      {/* Selar URL — only when paid */}
      {pricingType === 'paid' && (
        <div className="form-field">
          <label htmlFor="selar_url">Selar listing URL *</label>
          <input
            id="selar_url" name="selar_url" type="url"
            defaultValue={defaultValues.selar_url ?? ''}
            placeholder="https://selar.co/..."
          />
          <span className="hint">The Selar page where members purchase this resource.</span>
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

      {/* Tags — multi-select pill grid */}
      <div className="form-field">
        <label>Tags</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.375rem' }}>
          {CONTENT_TAGS.map(tag => {
            const selected = selectedTags.includes(tag)
            return (
              <button
                key={tag} type="button"
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '0.25rem 0.625rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: selected ? 600 : 400,
                  border: `1px solid ${selected ? '#0E2A47' : '#d1d5db'}`,
                  background: selected ? '#0E2A47' : '#f9fafb',
                  color: selected ? '#fff' : '#374151',
                  cursor: 'pointer',
                  transition: 'all 120ms',
                }}
              >
                {tag}
              </button>
            )
          })}
        </div>
        {selectedTags.length > 0 && (
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.375rem' }}>
            Selected: {selectedTags.join(', ')}
          </p>
        )}
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
      </div>

      {/* File upload — ebook / template */}
      {needsFile && (
        <div className="form-field">
          <label>Content file (PDF, ZIP, etc.)</label>
          {fileUrl && <p className="file-link"><a href={fileUrl} target="_blank" rel="noreferrer">Current file ↗</a></p>}
          <input
            type="file" disabled={uploadingFile}
            onChange={e => handleFileUpload(e, 'content-files', setFileUrl, setUploadingFile)}
          />
          {uploadingFile && <span className="uploading-label">Uploading…</span>}
        </div>
      )}

      {/* YouTube URL — courses only */}
      {isCourse && (
        <div className="form-field">
          <label htmlFor="course_url">YouTube video / playlist URL *</label>
          <input
            id="course_url" name="file_url" type="url"
            value={fileUrl}
            onChange={e => setFileUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... or playlist link"
            required={isCourse}
          />
          <span className="hint">Use an unlisted YouTube link. Members will watch it inline in the platform.</span>
        </div>
      )}

      {/* Epic G §G.5 — shared metadata every content type gets */}
      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0.5rem 0' }} />
      <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', margin: 0 }}>
        Discovery & metadata
      </p>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="domain">Domain</label>
          <select id="domain" name="domain" defaultValue={defaultValues.domain ?? ''}>
            <option value="">—</option>
            {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="level">Level</label>
          <select id="level" name="level" defaultValue={defaultValues.level ?? ''}>
            <option value="">—</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="resource_category">Resource category</label>
          <input id="resource_category" name="resource_category" type="text" defaultValue={defaultValues.resource_category ?? ''} placeholder="e.g. framework, teardown" />
        </div>
        <div className="form-field">
          <label htmlFor="estimated_time_minutes">Estimated time (minutes)</label>
          <input id="estimated_time_minutes" name="estimated_time_minutes" type="number" min="0" defaultValue={defaultValues.estimated_time_minutes ?? ''} />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="series_id">Series</label>
        <select id="series_id" name="series_id" defaultValue={defaultValues.series_id ?? ''}>
          <option value="">— None —</option>
          {series.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>

      <div className="form-field">
        <label>Intent</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.375rem' }}>
          {INTENTS.map(intent => {
            const selected = selectedIntents.includes(intent)
            return (
              <button key={intent} type="button" onClick={() => toggleFrom(selectedIntents, setSelectedIntents, intent)} style={{
                padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem',
                fontWeight: selected ? 600 : 400, border: `1px solid ${selected ? '#0E2A47' : '#d1d5db'}`,
                background: selected ? '#0E2A47' : '#f9fafb', color: selected ? '#fff' : '#374151', cursor: 'pointer',
              }}>
                {intent}
              </button>
            )
          })}
        </div>
      </div>

      {[
        { label: 'Topics', items: topics, selected: selectedTopics, setSelected: setSelectedTopics },
        { label: 'Goals', items: goals, selected: selectedGoals, setSelected: setSelectedGoals },
        { label: 'Roles', items: roles, selected: selectedRoles, setSelected: setSelectedRoles },
      ].map(group => (
        <div className="form-field" key={group.label}>
          <label>{group.label}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.375rem' }}>
            {group.items.length === 0 && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>None configured</span>}
            {group.items.map(item => {
              const selected = group.selected.includes(item.id)
              return (
                <button key={item.id} type="button" onClick={() => toggleFrom(group.selected, group.setSelected, item.id)} style={{
                  padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem',
                  fontWeight: selected ? 600 : 400, border: `1px solid ${selected ? '#0E2A47' : '#d1d5db'}`,
                  background: selected ? '#0E2A47' : '#f9fafb', color: selected ? '#fff' : '#374151', cursor: 'pointer',
                }}>
                  {item.name}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', margin: '0.5rem 0 0' }}>
        SEO
      </p>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="seo_title">SEO title</label>
          <input id="seo_title" name="seo_title" type="text" defaultValue={defaultValues.seo_title ?? ''} />
        </div>
        <div className="form-field">
          <label htmlFor="canonical_url">Canonical URL</label>
          <input id="canonical_url" name="canonical_url" type="url" defaultValue={defaultValues.canonical_url ?? ''} />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="seo_description">SEO description</label>
        <textarea id="seo_description" name="seo_description" rows={2} defaultValue={defaultValues.seo_description ?? ''} />
      </div>

      <div className="form-field">
        <label>OG image</label>
        {ogImageUrl && <img src={ogImageUrl} alt="OG preview" className="thumb-preview" />}
        <input type="file" accept="image/*" disabled={uploadingOg} onChange={e => handleFileUpload(e, 'thumbnails', setOgImageUrl, setUploadingOg)} />
        {uploadingOg && <span className="uploading-label">Uploading…</span>}
      </div>

      {/* Hidden fields */}
      <input type="hidden" name="cover_image_url" value={coverUrl} />
      {!isCourse && !needsFile && <input type="hidden" name="file_url" value={fileUrl} />}

      <div className="form-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button
          type="submit"
          disabled={isPending || uploadingThumb || uploadingFile}
          className="btn-secondary"
          style={{ order: 0 }}
        >
          {isPending && pendingIntent === 'draft' ? 'Saving…' : 'Save as draft'}
        </button>
        <button
          type="button"
          disabled={isPending || uploadingThumb || uploadingFile}
          className="btn-primary"
          onClick={e => {
            const form = (e.target as HTMLElement).closest('form') as HTMLFormElement
            if (form) {
              const syntheticEvent = { currentTarget: form, preventDefault: () => {} } as unknown as React.FormEvent<HTMLFormElement>
              handleSubmit('publish')(syntheticEvent)
            }
          }}
        >
          {isPending && pendingIntent === 'publish' ? 'Publishing…' : mode === 'create' ? 'Create & publish' : 'Save & publish'}
        </button>
      </div>
    </form>
  )
}
