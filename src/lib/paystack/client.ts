const PAYSTACK_BASE = 'https://api.paystack.co'

async function paystackFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(`Paystack error ${res.status}: ${error.message}`)
  }

  return res.json() as Promise<T>
}

export const paystack = {
  initializeTransaction: (data: { email: string; amount: number; reference?: string; metadata?: Record<string, unknown> }) =>
    paystackFetch<{ data: { authorization_url: string; access_code: string; reference: string } }>(
      '/transaction/initialize',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  verifyTransaction: (reference: string) =>
    paystackFetch<{ data: { status: string; amount: number; customer: { email: string } } }>(
      `/transaction/verify/${reference}`
    ),
}
