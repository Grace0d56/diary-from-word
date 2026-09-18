import { Hono } from 'hono'
import type { Context } from 'hono'
import type { Entry, GenerateRequest, GenerateResponse, Settings, User } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'
import { chatJson, type LlmConfig } from './llm'
import { buildMessages, normalizeResponse } from './prompt'
import type { Store } from './store/types'

export interface AppConfig {
  store: Store
  llm: LlmConfig
}

const MAX_GENERATIONS_PER_ENTRY = 12
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

type Vars = { user: User }

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export function createApp(cfg: AppConfig) {
  const app = new Hono<{ Variables: Vars }>().basePath('/api')

  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: err.message || 'server error' }, 500)
  })

  // Invite code = identity. Sent as a header on every request.
  app.use('*', async (c, next) => {
    if (c.req.path === '/api/health') return next()
    const code = c.req.header('x-invite-code')?.trim()
    if (!code) return c.json({ error: '需要邀请码' }, 401)
    const user = await cfg.store.getUserByCode(code)
    if (!user) return c.json({ error: '邀请码不对' }, 401)
    c.set('user', user)
    await next()
  })

  app.get('/health', (c) => c.json({ ok: true }))

  app.get('/me', (c) => c.json(c.get('user')))

  app.put('/settings', async (c) => {
    const user = c.get('user')
    const body = (await c.req.json()) as Partial<Settings>
    const settings: Settings = { ...DEFAULT_SETTINGS, ...user.settings, ...body }
    await cfg.store.updateSettings(user.id, settings)
    return c.json({ ...user, settings })
  })

  app.get('/entries', async (c) => {
    const user = c.get('user')
    const from = c.req.query('from') ?? '1970-01-01'
    const to = c.req.query('to') ?? '2999-12-31'
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) return c.json({ error: 'bad date' }, 400)
    return c.json(await cfg.store.listEntries(user.id, from, to))
  })

  app.get('/entries/:date', async (c) => {
    const date = c.req.param('date')
    if (!DATE_RE.test(date)) return c.json({ error: 'bad date' }, 400)
    // null (200) rather than 404 so the browser console stays quiet on empty days.
    return c.json(await cfg.store.getEntry(c.get('user').id, date))
  })

  // Full upsert of an entry: the client owns the shape, the server stamps timestamps.
  app.put('/entries/:date', async (c) => {
    const user = c.get('user')
    const date = c.req.param('date')
    if (!DATE_RE.test(date)) return c.json({ error: 'bad date' }, 400)
    const body = (await c.req.json()) as Partial<Entry>
    const existing = await cfg.store.getEntry(user.id, date)
    const now = new Date().toISOString()
    const entry: Entry = {
      date,
      feelings: body.feelings ?? existing?.feelings ?? [],
      activities: body.activities ?? existing?.activities ?? [],
      star: body.star ?? existing?.star ?? null,
      people: body.people ?? existing?.people ?? [],
      links: body.links ?? existing?.links ?? [],
      note: body.note ?? existing?.note ?? '',
      quiet: body.quiet ?? existing?.quiet ?? false,
      draft: body.draft ?? existing?.draft ?? '',
      text: body.text ?? existing?.text ?? '',
      edited: body.edited ?? existing?.edited ?? false,
      question: body.question === undefined ? existing?.question ?? null : body.question,
      answer: body.answer === undefined ? existing?.answer ?? null : body.answer,
      genCount: existing?.genCount ?? 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await cfg.store.upsertEntry(user.id, entry)
    return c.json(entry)
  })

  app.delete('/entries/:date', async (c) => {
    const user = c.get('user')
    const date = c.req.param('date')
    if (!DATE_RE.test(date)) return c.json({ error: 'bad date' }, 400)
    const existing = await cfg.store.getEntry(user.id, date)
    if (!existing) return c.json({ ok: true })
    // Soft delete: blank everything but keep the row so genCount limits survive.
    await cfg.store.upsertEntry(user.id, {
      ...existing,
      feelings: [], activities: [], star: null, people: [], links: [], note: '', quiet: false,
      draft: '', text: '', edited: false, question: null, answer: null,
      updatedAt: new Date().toISOString(),
    })
    return c.json({ ok: true })
  })

  // Write (or re-shape) the diary for one day. Returns the draft + optional sharpen question,
  // and persists both on the entry.
  app.post('/generate', async (c: Context<{ Variables: Vars }>) => {
    const user = c.get('user')
    const req = (await c.req.json()) as GenerateRequest
    const input = req.input
    if (!input || !DATE_RE.test(input.date)) return c.json({ error: 'bad input' }, 400)
    if (!input.quiet && input.feelings.length === 0) return c.json({ error: '至少选一个感受' }, 400)

    const existing = await cfg.store.getEntry(user.id, input.date)
    const genCount = existing?.genCount ?? 0
    if (genCount >= MAX_GENERATIONS_PER_ENTRY) return c.json({ error: '这一天改得够多了，直接手改吧' }, 429)

    const [yesterday, examples] = await Promise.all([
      cfg.store.getEntry(user.id, shiftDate(input.date, -1)),
      cfg.store.listEditedEntries(user.id, 3),
    ])

    const messages = buildMessages({
      tone: user.settings.tone ?? 'plain',
      input,
      answer: req.answer,
      question: existing?.question ?? null,
      yesterday: yesterday && yesterday.text ? yesterday : null,
      examples: examples.filter((e) => e.date !== input.date),
      adjust: req.adjust,
      previousText: req.previousText,
    })

    const result = normalizeResponse(await chatJson<GenerateResponse>(cfg.llm, messages))
    // Once the user has answered a question, don't ask another.
    const question = req.answer || req.adjust ? null : result.question

    const now = new Date().toISOString()
    const entry: Entry = {
      ...input,
      draft: result.draft,
      text: result.draft,
      edited: false,
      question,
      answer: req.answer ?? existing?.answer ?? null,
      genCount: genCount + 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await cfg.store.upsertEntry(user.id, entry)
    return c.json(entry)
  })

  return app
}

export function llmConfigFromEnv(env: Record<string, string | undefined>): LlmConfig {
  const apiKey = env.LLM_API_KEY
  if (!apiKey) throw new Error('LLM_API_KEY is not set')
  return {
    baseUrl: env.LLM_BASE_URL || 'https://api.openai.com/v1',
    apiKey,
    model: env.LLM_MODEL || 'gpt-4o-mini',
  }
}
