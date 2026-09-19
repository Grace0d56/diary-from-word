// Cloudflare Workers entry. Static assets are served by the [assets] binding in wrangler.toml;
// only /api/* reaches this code.
import { createApp, llmConfigFromEnv } from './app'
import { createSupabaseStore } from './store/supabase'

interface Env {
  LLM_BASE_URL?: string
  LLM_API_KEY?: string
  LLM_MODEL?: string
  SUPABASE_URL?: string
  SUPABASE_SERVICE_KEY?: string
}

let cached: { key: string; fetch: (req: Request, env: Env, ctx: ExecutionContext) => Response | Promise<Response> } | null = null

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const key = `${env.SUPABASE_URL}|${env.LLM_BASE_URL}|${env.LLM_MODEL}`
    if (!cached || cached.key !== key) {
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
        return new Response(JSON.stringify({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY not configured' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        })
      }
      const store = createSupabaseStore(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
      const app = createApp({ store, llm: llmConfigFromEnv(env as Record<string, string | undefined>) })
      cached = { key, fetch: (r, e, c) => app.fetch(r, e, c) }
    }
    return await cached.fetch(req, env, ctx)
  },
}
