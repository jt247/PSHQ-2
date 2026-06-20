'use client'

interface SelarButtonProps {
  contentId: string
  selarUrl: string
  label: string
}

export function SelarButton({ contentId, selarUrl, label }: SelarButtonProps) {
  async function handleClick() {
    try {
      await fetch('/api/interactions/selar-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId }),
        keepalive: true,
      })
    } catch { /* non-fatal — tracking must never block navigation */ }
  }

  return (
    <a
      href={selarUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-primary"
      style={{ display: 'block', textAlign: 'center' }}
      onClick={handleClick}
    >
      Get this {label} on Selar →
    </a>
  )
}
