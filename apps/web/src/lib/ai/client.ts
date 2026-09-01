// AI text generation, OpenAI only (JT decision, 2026-09-01: the NVIDIA
// free-tier fallback this file used to have never reliably worked and is
// no longer worth the complexity — one provider, kept simple, an admin
// switch to add other providers is a future consideration, not now).
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
export const AI_MODEL_NAME = 'gpt-4o-mini'

export async function generateText(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AI_MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 1536,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = new Error(`OpenAI API error ${res.status}: ${body.slice(0, 500)}`)
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('OpenAI API returned no content')
  return text.trim()
}
