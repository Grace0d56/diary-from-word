import type { Adjust, Entry, EntryInput, Settings, User } from '../shared/types'
import { local } from './lib/local'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch('/api' + path, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-invite-code': local.getCode() ?? '',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    let msg = `请求失败 (${res.status})`
    try {
      const j = (await res.json()) as { error?: string }
      if (j.error) msg = j.error
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg)
  }
  return (await res.json()) as T
}

export const api = {
  me: () => call<User>('GET', '/me'),
  updateSettings: (s: Partial<Settings>) => call<User>('PUT', '/settings', s),
  listEntries: (from: string, to: string) => call<Entry[]>('GET', `/entries?from=${from}&to=${to}`),
  getEntry: (date: string) => call<Entry | null>('GET', `/entries/${date}`),
  saveEntry: (date: string, patch: Partial<Entry>) => call<Entry>('PUT', `/entries/${date}`, patch),
  deleteEntry: (date: string) => call<{ ok: true }>('DELETE', `/entries/${date}`),
  generate: (input: EntryInput, extra?: { answer?: string; adjust?: Adjust; previousText?: string }) =>
    call<Entry>('POST', '/generate', { input, ...extra }),
}
