'use client'

import { useState } from 'react'

interface Props {
  contentId: string
  priceFormatted: string
}

export function PurchaseButton({ contentId, priceFormatted }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePurchase() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/payments/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId }),
      })
      const data = await res.json() as { authorization_url?: string; error?: string }
      if (!res.ok || !data.authorization_url) {
        setError(data.error ?? 'Failed to initialize payment. Please try again.')
        setLoading(false)
        return
      }
      window.location.href = data.authorization_url
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handlePurchase}
        disabled={loading}
        style={{
          display: 'block', width: '100%', textAlign: 'center',
          background: loading ? '#6b7280' : '#111827', color: '#fff', borderRadius: '8px',
          padding: '0.625rem 1rem', fontWeight: 600, fontSize: '0.9375rem',
          border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Redirecting to Paystack…' : `Purchase — ${priceFormatted}`}
      </button>
      {error && (
        <p style={{ fontSize: '0.8125rem', color: '#b91c1c', margin: '0.5rem 0 0', textAlign: 'center' }}>{error}</p>
      )}
    </div>
  )
}
