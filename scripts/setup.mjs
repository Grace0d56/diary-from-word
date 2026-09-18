// Beginner-friendly setup: asks a few questions and writes .env.
// Run with: npm run setup
import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

// Small prompt helper that also works when answers are piped in.
const rl = createInterface({ input: stdin, output: stdout })
const queue = []
const waiters = []
let closed = false
rl.on('line', (l) => (waiters.length ? waiters.shift()(l) : queue.push(l)))
rl.on('close', () => {
  closed = true
  while (waiters.length) waiters.shift()('')
})
function ask(text) {
  stdout.write(text)
  if (queue.length) return Promise.resolve(queue.shift())
  if (closed) return Promise.resolve('')
  return new Promise((resolve) => waiters.push(resolve))
}

const existing = existsSync('.env') ? readFileSync('.env', 'utf8') : ''
const current = existing.match(/^LLM_API_KEY=(.*)$/m)?.[1]?.trim()

console.log('\n几个词 · local setup\n')
const key = (await ask(`1/3  OpenAI API key${current ? ' (press Enter to keep the existing one)' : ''}: `)).trim() || current || ''
if (!key) {
  console.log('\nNo key given. Get one at https://platform.openai.com/api-keys and run this again.')
  process.exit(1)
}
const model = (await ask('2/3  Model name [gpt-4o-mini]: ')).trim() || 'gpt-4o-mini'
const codes =
  (await ask('3/3  Invite codes, code:name pairs separated by commas [demo:我,friend:朋友]: ')).trim() || 'demo:我,friend:朋友'
rl.close()

writeFileSync(
  '.env',
  [
    'LLM_BASE_URL=https://api.openai.com/v1',
    `LLM_API_KEY=${key}`,
    `LLM_MODEL=${model}`,
    'SUPABASE_URL=',
    'SUPABASE_SERVICE_KEY=',
    `DEV_INVITE_CODES=${codes}`,
    'PORT=8787',
    '',
  ].join('\n'),
)
console.log('\nSaved to .env. Now run:  npm run dev\n')
