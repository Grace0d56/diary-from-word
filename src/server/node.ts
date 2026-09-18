// Local / VPS entry: serves the API and, in production, the built client from ./dist.
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createApp, llmConfigFromEnv } from './app'
import { createFileStore } from './store/file'
import { createSupabaseStore } from './store/supabase'

async function loadDotEnv() {
  try {
    const text = await fs.readFile(path.resolve('.env'), 'utf8')
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* no .env, fine */
  }
}

await loadDotEnv()
const env = process.env

const store = env.SUPABASE_URL
  ? createSupabaseStore(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY ?? '')
  : createFileStore(path.resolve('data/store.json'), env.DEV_INVITE_CODES ?? 'demo:我')

const api = createApp({ store, llm: llmConfigFromEnv(env) })

const root = new Hono()
root.route('/', api)
if (env.NODE_ENV === 'production') {
  root.use('/*', serveStatic({ root: './dist' }))
  root.get('*', serveStatic({ path: './dist/index.html' }))
}

const port = Number(env.PORT ?? 8787)
serve({ fetch: root.fetch, port })
console.log(`[server] http://localhost:${port}  store=${env.SUPABASE_URL ? 'supabase' : 'file'} model=${env.LLM_MODEL ?? 'gpt-4o-mini'}`)
