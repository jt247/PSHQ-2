// NVIDIA Build (integrate.api.nvidia.com) — OpenAI-compatible chat completions.
// Free-tier GLM model, swapped in to avoid Gemini billing.
const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const MODEL = 'z-ai/glm-5.2'

export const AI_MODEL_NAME = MODEL

export async function generateText(prompt: string): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) throw new Error('NVIDIA_API_KEY not configured')

  const res = await fetch(NVIDIA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = new Error(`NVIDIA API error ${res.status}: ${body.slice(0, 500)}`)
    // Preserve the status so callers can detect rate limiting the same way the old Gemini code did.
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('NVIDIA API returned no content')
  return text.trim()
}
