'use client'

import { useState } from 'react'
import Image from 'next/image'

interface CaseFile {
  id: string
  file_url: string
  file_label: string | null
  file_type: string | null
}

interface CaseEntry {
  id: string
  title: string
  company_name: string
  description: string | null
  thumbnail_url: string | null
  tags: string[]
  files: CaseFile[]
}

interface Props {
  entries: CaseEntry[]
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 1v7M3 6l3 3 3-3M1 10h10" />
    </svg>
  )
}

function isPlaceholder(fileUrl: string) {
  return fileUrl.startsWith('placeholder://')
}

function FileRow({ file }: { file: CaseFile }) {
  const label = file.file_label ?? 'Download'
  const ext = file.file_type?.toUpperCase() ?? 'PDF'
  const placeholder = isPlaceholder(file.file_url)

  return (
    <div className="pcl-file-row">
      <div className="pcl-file-icon-label">
        <div className="pcl-file-icon" aria-hidden="true">{ext}</div>
        <div>
          <div className="pcl-file-label">{label}</div>
          <div className="pcl-file-type">{ext}</div>
        </div>
      </div>

      {placeholder ? (
        <span className="pcl-file-placeholder">Coming soon</span>
      ) : (
        <a
          href={`/api/case-library/download/${file.id}`}
          className="pcl-download-btn"
          aria-label={`Download ${label}`}
          onClick={(e) => e.stopPropagation()}
        >
          <DownloadIcon />
          Download
        </a>
      )}
    </div>
  )
}

function CompanyInitial({ name }: { name: string }) {
  return (
    <span aria-hidden="true" style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, color: 'var(--color-text-muted)', fontSize: '1.25rem' }}>
      {name.charAt(0)}
    </span>
  )
}

export function CaseLibraryGrid({ entries }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function toggle(id: string) {
    setExpandedId(prev => prev === id ? null : id)
  }

  if (entries.length === 0) {
    return (
      <div className="pcl-empty">
        <h2>No case studies yet</h2>
        <p>The first entries are in progress. Check back soon.</p>
      </div>
    )
  }

  return (
    <div className="pcl-grid" role="list">
      {entries.map(entry => {
        const expanded = expandedId === entry.id
        return (
          <article
            key={entry.id}
            className="pcl-card"
            data-expanded={expanded ? 'true' : 'false'}
            role="listitem"
            aria-expanded={expanded}
          >
            {/* Always-visible header — clicking toggles expand */}
            <button
              className="pcl-card-header"
              onClick={() => toggle(entry.id)}
              aria-controls={`case-body-${entry.id}`}
              style={{ all: 'unset', display: 'flex', gap: '1.25rem', padding: '1.75rem', alignItems: 'flex-start', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}
            >
              <div className="pcl-card-thumb" aria-hidden="true">
                {entry.thumbnail_url
                  ? <Image src={entry.thumbnail_url} alt="" width={72} height={72} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                  : <CompanyInitial name={entry.company_name} />
                }
              </div>

              <div className="pcl-card-meta">
                <span className="pcl-card-company">{entry.company_name}</span>
                <h2 className="pcl-card-title">{entry.title}</h2>
                {entry.tags.length > 0 && (
                  <div className="pcl-card-tags" aria-label="Tags">
                    {entry.tags.map(tag => (
                      <span key={tag} className="pcl-tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <span className="pcl-card-toggle" aria-hidden="true">+</span>
            </button>

            {/* Expandable body */}
            <div
              className="pcl-card-body"
              id={`case-body-${entry.id}`}
              aria-hidden={!expanded}
            >
              <div className="pcl-card-body-inner">
                <p className="pcl-card-description">
                  {entry.description ?? 'No description available.'}
                </p>

                <div className="pcl-files">
                  <p className="pcl-files-heading">
                    {entry.files.length} {entry.files.length === 1 ? 'file' : 'files'} attached
                  </p>
                  {entry.files.length === 0 ? (
                    <p className="pcl-file-placeholder">No files attached yet.</p>
                  ) : (
                    entry.files.map(file => <FileRow key={file.id} file={file} />)
                  )}
                </div>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
