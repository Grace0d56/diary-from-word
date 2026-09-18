import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Entry, EntryInput, Settings, User } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../../shared/types'
import type { Store } from './types'

interface EntryRow {
  user_id: string
  date: string
  input: EntryInput
  draft: string
  text: string
  edited: boolean
  question: Entry['question']
  answer: string | null
  gen_count: number
  created_at: string
  updated_at: string
}

function rowToEntry(r: EntryRow): Entry {
  return {
    ...r.input,
    date: r.date,
    draft: r.draft,
    text: r.text,
    edited: r.edited,
    question: r.question,
    answer: r.answer,
    genCount: r.gen_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function entryToRow(userId: string, e: Entry): EntryRow {
  const { draft, text, edited, question, answer, genCount, createdAt, updatedAt, ...input } = e
  return {
    user_id: userId,
    date: e.date,
    input,
    draft,
    text,
    edited,
    question,
    answer,
    gen_count: genCount,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

export function createSupabaseStore(url: string, serviceKey: string): Store {
  const sb: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false } })

  return {
    async getUserByCode(code) {
      const { data, error } = await sb.from('users').select('id,name,settings').eq('invite_code', code).maybeSingle()
      if (error) throw error
      return data ? { id: data.id, name: data.name, settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) } } : null
    },
    async updateSettings(userId, settings) {
      const { error } = await sb.from('users').update({ settings }).eq('id', userId)
      if (error) throw error
    },
    async listEntries(userId, from, to) {
      const { data, error } = await sb
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', from)
        .lte('date', to)
        .order('date')
      if (error) throw error
      return (data as EntryRow[]).map(rowToEntry)
    },
    async getEntry(userId, date) {
      const { data, error } = await sb.from('entries').select('*').eq('user_id', userId).eq('date', date).maybeSingle()
      if (error) throw error
      return data ? rowToEntry(data as EntryRow) : null
    },
    async upsertEntry(userId, entry) {
      const { error } = await sb.from('entries').upsert(entryToRow(userId, entry), { onConflict: 'user_id,date' })
      if (error) throw error
    },
    async listEditedEntries(userId, limit) {
      const { data, error } = await sb
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .eq('edited', true)
        .order('date', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data as EntryRow[]).map(rowToEntry).filter((e) => e.text.trim())
    },
  }
}
