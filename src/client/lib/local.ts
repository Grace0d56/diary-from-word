import type { EntryInput } from '../../shared/types'

const CODE_KEY = 'jgc.code'
const DRAFT_PREFIX = 'jgc.input.'

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode etc. */
  }
}

export const local = {
  getCode: () => read<string>(CODE_KEY),
  setCode: (code: string | null) => write(CODE_KEY, code),
  /** In-progress taps for a day, so a refresh doesn't lose them. */
  getInput: (date: string) => read<EntryInput>(DRAFT_PREFIX + date),
  setInput: (date: string, input: EntryInput | null) => write(DRAFT_PREFIX + date, input),
}
