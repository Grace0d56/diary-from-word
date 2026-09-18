# 几个词 · diary-from-word

点几个词，AI 写成今天的日记。A tap-first diary: pick a few words, the model writes the entry.

The words are the record, the prose is the mirror. The model is only allowed to write what the words say.

## How an entry works

1. **感受** — pick 1 to 3 feeling words from an energy × pleasantness grid. Tap twice for 很.
2. **做了什么 / 和谁** — activity and people chips. Star one activity as the day's 主角.
3. **是因为什么** — link each feeling to a cause with one tap.
4. **一句话** — optional, the only text field in the app.
5. The model returns a 3 to 5 sentence draft plus, at most, one follow-up question with tappable answers.
6. Adjust with 短一点 / 温柔一点 / 平实一点 / 换个写法, or edit by hand. Hand-edited entries are fed back as voice examples.

Also: 平淡的一天 one-tap entries, a month calendar coloured by feeling, Markdown/JSON export.

## Stack

- Client: Vite + React + TypeScript, plain CSS, mobile-first, installable as a PWA. `src/client/`
- Server: Hono. Runs on Node locally and on Cloudflare Workers in production. `src/server/`
- Storage: Supabase (Postgres) in production, a JSON file in local dev. `src/server/store/`
- LLM: any OpenAI-compatible endpoint (OpenAI, DeepSeek, Qwen, Kimi, GLM). Switched by env only. `src/server/llm.ts`
- Vocabulary and all copy: `src/client/data/vocab.ts`. Prompt: `src/server/prompt.ts`.

Identity is an invite code: one row per person in the `users` table, sent as a header on every request.
The browser never talks to Supabase or the LLM directly.

## Local development

```bash
npm install
npm run setup            # asks for your API key and writes .env (or copy .env.example by hand)
npm run dev              # API on :8787, client on :5173 (proxied); also reachable from your phone on the same Wi-Fi
```

Log in with one of the codes from `DEV_INVITE_CODES` (default `demo`).

## Production (Cloudflare Workers + Supabase)

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor. Add one `users` row per person with their invite code.
2. Set the non-secret vars in `wrangler.toml` (`LLM_BASE_URL`, `LLM_MODEL`, `SUPABASE_URL`).
3. Secrets:
   ```bash
   npx wrangler secret put LLM_API_KEY
   npx wrangler secret put SUPABASE_SERVICE_KEY
   ```
4. `npm run deploy`

For mainland users, put a custom domain in front of the Worker; the default `workers.dev` host is unreliable there.
Swapping to a Chinese model later is three variables: `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`.

Any Node host works too: `npm run build && npm start` serves the API and the built client from one process.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | API + client with hot reload |
| `npm run build` | Build the client into `dist/` |
| `npm start` | Serve API + built client on Node |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run deploy` | Build and deploy to Cloudflare |
