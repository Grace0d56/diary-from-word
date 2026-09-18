import type { Entry, Settings, User } from '../../shared/types'

export interface Store {
  getUserByCode(code: string): Promise<User | null>
  updateSettings(userId: string, settings: Settings): Promise<void>
  listEntries(userId: string, from: string, to: string): Promise<Entry[]>
  getEntry(userId: string, date: string): Promise<Entry | null>
  upsertEntry(userId: string, entry: Entry): Promise<void>
  /** Most recent entries the user edited by hand, newest first. Used as voice examples. */
  listEditedEntries(userId: string, limit: number): Promise<Entry[]>
}
