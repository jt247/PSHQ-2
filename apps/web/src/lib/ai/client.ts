// AI text generation. Gemini is the primary provider platform-wide (JT
// decision, 2026-09-07) — OpenAI is kept only as an automatic backup if
// the Gemini call fails (missing quota, transient error), never as the
// first choice. Every AI feature on web and mobile routes through this
// one function (ai-summary, content-assistance, learning-path generation,
// rerank) — mobile has no separate AI client of its own, it calls these
// same web API routes, so fixing this one file is the whole platform.
// The rolling "-latest" alias rather than a pinned version — a pinned
// snapshot (gemini-2.5-flash) went from working to a 404 "no longer
// available to new users" between when this was first written and
// verified, confirmed live against the real API. The alias always points
// at Google's current recommended flash model, so this doesn't rot again.
const GEMINI_MODEL = 'gemini-flash-latest'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
export const AI_MODEL_NAME = GEMINI_MODEL

async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  // Security review flagged the key riding in the query string — it can
  // land in access logs, proxy logs, and browser/Node history. Sent as a
  // header instead, which Gemini's REST API supports natively.
  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1536 },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = new Error(`Gemini API error ${res.status}: ${body.slice(0, 500)}`)
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }

  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini API returned no content')
  return text.trim()
}

async function generateWithOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
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

export async function generateText(prompt: string): Promise<string> {
  try {
    return await generateWithGemini(prompt)
  } catch (geminiError) {
    // Backup only — never the first attempt. A 429 on the primary
    // provider is exactly the case this exists for.
    if (!process.env.OPENAI_API_KEY) throw geminiError
    return await generateWithOpenAI(prompt)
  }
}
