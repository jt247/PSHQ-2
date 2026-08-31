// AI summary generation. Prefers OpenAI when OPENAI_API_KEY is set — NVIDIA
// Build's free-tier models have been retired twice in a week (z-ai/glm-5.2
// on 2026-08-21, then meta/llama-3.3-70b-instruct on 2026-08-26, both 410
// Gone) and its endpoint has also shown multi-minute hangs under load,
// which reads as "AI summary failing" from the user's side even when it's
// really a slow/unreliable upstream rather than a bad key. OpenAI is paid
// but stable — worth the cost for a feature that's supposed to just work.
//
// Falls back to NVIDIA automatically when OPENAI_API_KEY isn't set, so this
// ships safely before the key exists and switches over the moment it does.
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o-mini'

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const NVIDIA_MODEL = 'openai/gpt-oss-20b'

export const AI_MODEL_NAME = process.env.OPENAI_API_KEY ? OPENAI_MODEL : NVIDIA_MODEL

async function callChatCompletions(url: string, apiKey: string, model: string, prompt: string, providerLabel: string): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = new Error(`${providerLabel} API error ${res.status}: ${body.slice(0, 500)}`)
    // Preserve the status so callers can detect rate limiting the same way the old Gemini code did.
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error(`${providerLabel} API returned no content`)
  return text.trim()
}

export async function generateText(prompt: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    return callChatCompletions(OPENAI_API_URL, openaiKey, OPENAI_MODEL, prompt, 'OpenAI')
  }

  const nvidiaKey = process.env.NVIDIA_API_KEY
  if (!nvidiaKey) throw new Error('Neither OPENAI_API_KEY nor NVIDIA_API_KEY is configured')
  return callChatCompletions(NVIDIA_API_URL, nvidiaKey, NVIDIA_MODEL, prompt, 'NVIDIA')
}
