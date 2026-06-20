'use client'

import { useState } from 'react'

interface Pathway {
  id: string
  slug: string
  title: string
  description: string | null
  status: 'live' | 'coming_soon'
  display_order: number
}

interface Props {
  pathways: Pathway[]
}

const ARCHITECT_TAGS = [
  'Growth',
  'Technical',
  'AI-Native',
  'Infrastructure',
  'Leadership',
  'Founder Mode',
]

export function CurriculumGrid({ pathways }: Props) {
  const [hintId, setHintId] = useState<string | null>(null)

  function handleClick(pathway: Pathway) {
    if (pathway.status === 'coming_soon') {
      setHintId(prev => prev === pathway.id ? null : pathway.id)
    }
  }

  const ordinals = ['01', '02', '03', '04', '05', '06']

  return (
    <div className="opc-bento" role="list">
      {pathways.map((pathway, idx) => {
        const isArchitect = idx === pathways.length - 1
        const showHint = hintId === pathway.id

        if (isArchitect) {
          return (
            <article
              key={pathway.id}
              className="opc-cell"
              data-show-hint={showHint ? 'true' : 'false'}
              role="listitem"
              onClick={() => handleClick(pathway)}
              aria-label={`${pathway.title} — Coming Soon`}
              style={{ cursor: 'pointer' }}
            >
              <span className="opc-cell-ordinal" aria-hidden="true">
                {ordinals[idx]}
              </span>

              <div className="opc-architect-left">
                <span className="opc-coming-badge">Coming Soon</span>
                <h3 className="opc-cell-title">{pathway.title}</h3>
                <p className="opc-cell-desc">{pathway.description}</p>
              </div>

              <div className="opc-architect-right" aria-hidden="true">
                {ARCHITECT_TAGS.map(tag => (
                  <span key={tag} className="opc-architect-tag">{tag}</span>
                ))}
              </div>

              {showHint && (
                <div className="opc-cell-click-hint" role="dialog" aria-label="Coming soon">
                  <span className="opc-hint-text">This pathway is in progress.</span>
                  <span className="opc-hint-sub">It'll be ready when the curriculum launches.</span>
                  <button
                    className="opc-hint-close"
                    onClick={e => { e.stopPropagation(); setHintId(null) }}
                    aria-label="Close"
                    style={{ color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.2)' }}
                  >
                    Got it
                  </button>
                </div>
              )}
            </article>
          )
        }

        return (
          <article
            key={pathway.id}
            className="opc-cell"
            data-show-hint={showHint ? 'true' : 'false'}
            role="listitem"
            onClick={() => handleClick(pathway)}
            aria-label={`${pathway.title} — Coming Soon`}
            style={{ cursor: 'pointer' }}
          >
            <span className="opc-cell-ordinal" aria-hidden="true">
              {ordinals[idx]}
            </span>

            <span className="opc-coming-badge">Coming Soon</span>
            <h3 className="opc-cell-title">{pathway.title}</h3>
            <p className="opc-cell-desc">{pathway.description}</p>

            {showHint && (
              <div className="opc-cell-click-hint" role="dialog" aria-label="Coming soon">
                <span className="opc-hint-text">This pathway isn&apos;t live yet.</span>
                <span className="opc-hint-sub">The full curriculum is coming soon.</span>
                <button
                  className="opc-hint-close"
                  onClick={e => { e.stopPropagation(); setHintId(null) }}
                  aria-label="Close"
                >
                  Got it
                </button>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
