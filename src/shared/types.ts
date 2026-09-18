// Types shared by client and server. Keep this file dependency-free.

/** Mood grid quadrant: energy (h/l) × pleasantness (p/u). */
export type Quadrant = 'hp' | 'hu' | 'lp' | 'lu'

export type Tone = 'plain' | 'warm'

export interface FeelingPick {
  word: string
  quadrant: Quadrant
  /** Tapped twice = "很". */
  intense: boolean
}

/** "X 是因为 Y". cause is an activity/person word or one of CAUSE_OTHER / CAUSE_UNSURE. */
export interface Link {
  feeling: string
  cause: string
}

export const CAUSE_OTHER = '别的事'
export const CAUSE_UNSURE = '说不清'

/** Everything the user tapped or typed for one day. */
export interface EntryInput {
  date: string // YYYY-MM-DD, local "diary day" (4am boundary)
  feelings: FeelingPick[]
  activities: string[]
  /** The starred activity, the day's protagonist. */
  star: string | null
  people: string[]
  links: Link[]
  note: string
  /** "平淡的一天" shortcut. */
  quiet: boolean
}

export interface Question {
  text: string
  options: string[]
}

export interface Entry extends EntryInput {
  /** Latest AI draft. */
  draft: string
  /** What the user keeps; equals draft unless edited. */
  text: string
  edited: boolean
  question: Question | null
  answer: string | null
  genCount: number
  createdAt: string
  updatedAt: string
}

export interface Settings {
  tone: Tone
  /** Custom words the user added, by category. */
  customFeelings: { word: string; quadrant: Quadrant }[]
  customActivities: string[]
  customPeople: string[]
}

export const DEFAULT_SETTINGS: Settings = {
  tone: 'plain',
  customFeelings: [],
  customActivities: [],
  customPeople: [],
}

export interface User {
  id: string
  name: string
  settings: Settings
}

export type Adjust = 'shorter' | 'warmer' | 'plainer' | 'rewrite'

export interface GenerateRequest {
  input: EntryInput
  /** Answer to the sharpen question, if the user tapped one. */
  answer?: string
  /** Re-shape an existing draft instead of writing fresh. */
  adjust?: Adjust
  previousText?: string
}

export interface GenerateResponse {
  draft: string
  question: Question | null
}

export function emptyInput(date: string): EntryInput {
  return { date, feelings: [], activities: [], star: null, people: [], links: [], note: '', quiet: false }
}
