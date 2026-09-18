// Local-dev store: one JSON file. Never used on Cloudflare.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Entry, Settings, User } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../../shared/types'
import type { Store } from './types'

interface FileData {
  users: (User & { code: string })[]
  entries: Record<string, Record<string, Entry>>
}

export function createFileStore(filePath: string, inviteCodes: string): Store {
  let cache: FileData | null = null

  async function load(): Promise<FileData> {
    if (cache) return cache
    try {
      cache = JSON.parse(await fs.readFile(filePath, 'utf8')) as FileData
    } catch {
      cache = { users: [], entries: {} }
    }
    // Seed / refresh users from DEV_INVITE_CODES ("code:name,code:name").
    for (const pair of inviteCodes.split(',').map((s) => s.trim()).filter(Boolean)) {
      const [code, name = code] = pair.split(':')
      if (!cache.users.some((u) => u.code === code)) {
        cache.users.push({ id: `dev-${code}`, code, name, settings: { ...DEFAULT_SETTINGS } })
      }
    }
    return cache
  }

  async function save() {
    if (!cache) return
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(cache, null, 2))
  }

  return {
    async getUserByCode(code) {
      const d = await load()
      const u = d.users.find((u) => u.code === code)
      return u ? { id: u.id, name: u.name, settings: { ...DEFAULT_SETTINGS, ...u.settings } } : null
    },
    async updateSettings(userId, settings) {
      const d = await load()
      const u = d.users.find((u) => u.id === userId)
      if (u) u.settings = settings
      await save()
    },
    async listEntries(userId, from, to) {
      const d = await load()
      return Object.values(d.entries[userId] ?? {})
        .filter((e) => e.date >= from && e.date <= to)
        .sort((a, b) => a.date.localeCompare(b.date))
    },
    async getEntry(userId, date) {
      const d = await load()
      return d.entries[userId]?.[date] ?? null
    },
    async upsertEntry(userId, entry) {
      const d = await load()
      ;(d.entries[userId] ??= {})[entry.date] = entry
      await save()
    },
    async listEditedEntries(userId, limit) {
      const d = await load()
      return Object.values(d.entries[userId] ?? {})
        .filter((e) => e.edited && e.text.trim())
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit)
    },
  }
}
