const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function keyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Diary day: anything before 4am counts as the previous day. */
export function todayKey(now = new Date()): string {
  const d = new Date(now)
  if (d.getHours() < 4) d.setDate(d.getDate() - 1)
  return keyOf(d)
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function shiftKey(key: string, days: number): string {
  const d = parseKey(key)
  d.setDate(d.getDate() + days)
  return keyOf(d)
}

/** "9月18日 周五" */
export function formatShort(key: string): string {
  const d = parseKey(key)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`
}

/** "2026年9月" */
export function formatMonth(year: number, month: number): string {
  return `${year}年${month}月`
}

export function isFuture(key: string): boolean {
  return key > todayKey()
}
