// Thin client for any OpenAI-compatible chat endpoint (OpenAI, DeepSeek, Qwen, Kimi, GLM...).
// Provider is chosen purely by env: LLM_BASE_URL, LLM_API_KEY, LLM_MODEL.

export interface LlmConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chatJson<T>(cfg: LlmConfig, messages: ChatMessage[]): Promise<T> {
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`LLM ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const raw = data.choices?.[0]?.message?.content ?? ''
  return parseJson<T>(raw)
}

/** Tolerates ```json fences and stray text around the object. */
export function parseJson<T>(raw: string): T {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(trimmed) as T
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as T
    throw new Error('LLM returned non-JSON: ' + raw.slice(0, 200))
  }
}
