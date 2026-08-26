'use client'

import { useEffect, useState } from 'react'

interface Props {
  text: string
}

type Status = 'idle' | 'playing' | 'paused'

// Article bodies are stored as plain text with markdown-style headings (see
// htmlToText/renderBody in the article page) and may occasionally arrive as
// HTML from a pasted draft. Strip both down to prose before handing it to
// the speech synthesizer — otherwise it reads out raw tags and asterisks.
function toSpeechText(raw: string): string {
  return raw
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|h[1-6]|li|ul|ol|blockquote)\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#3[49];/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`{1,3}([^`]*?)`{1,3}/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ponytail: Chrome pauses speechSynthesis after ~15s when the tab is
// backgrounded/minimized — a documented browser limitation of this
// API, not something to work around here. See SIDENOTES.md.
export function ListenButton({ text }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  function handleClick() {
    const synth = window.speechSynthesis

    if (status === 'playing') {
      synth.pause()
      setStatus('paused')
      return
    }
    if (status === 'paused') {
      synth.resume()
      setStatus('playing')
      return
    }

    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(toSpeechText(text))
    utterance.onend = () => setStatus('idle')
    utterance.onerror = () => setStatus('idle')
    synth.speak(utterance)
    setStatus('playing')
  }

  const label = status === 'playing' ? '⏸ Pause' : status === 'paused' ? '▶ Resume' : '🔊 Listen'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!supported}
      title={supported ? undefined : "Text-to-speech isn't supported in this browser"}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        width: '100%',
        padding: '0.75rem 1rem',
        border: `1px solid ${status !== 'idle' ? '#6366f1' : '#d1d5db'}`,
        borderRadius: '0.625rem',
        background: status !== 'idle' ? '#eef2ff' : '#fff',
        color: status !== 'idle' ? '#4f46e5' : '#374151',
        fontSize: '0.875rem', fontWeight: 600,
        cursor: supported ? 'pointer' : 'not-allowed',
        opacity: supported ? 1 : 0.5,
        transition: 'all 150ms',
      }}
    >
      {label}
    </button>
  )
}
