import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { Entry } from '../../shared/types'
import { api } from '../api'
import { QUADRANTS, QUADRANT_COLORS } from '../data/vocab'
import { formatMonth, formatShort, isFuture, keyOf, todayKey } from '../lib/date'

interface Props {
  onOpen: (date: string) => void
}

const WD = ['一', '二', '三', '四', '五', '六', '日']

export function Calendar({ onOpen }: Props) {
  const today = todayKey()
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number)
    return { y, m }
  })
  const [entries, setEntries] = useState<Entry[]>([])
  const [error, setError] = useState<string | null>(null)

  const from = `${cursor.y}-${String(cursor.m).padStart(2, '0')}-01`
  const lastDay = new Date(cursor.y, cursor.m, 0).getDate()
  const to = `${cursor.y}-${String(cursor.m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  useEffect(() => {
    api.listEntries(from, to).then(setEntries).catch((e: Error) => setError(e.message))
  }, [from, to])

  const byDate = useMemo(() => new Map(entries.filter((e) => e.text).map((e) => [e.date, e])), [entries])

  // Monday-first offset.
  const firstWeekday = (new Date(cursor.y, cursor.m - 1, 1).getDay() + 6) % 7
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: lastDay }, (_, i) => keyOf(new Date(cursor.y, cursor.m - 1, i + 1))),
  ]

  function move(delta: number) {
    const d = new Date(cursor.y, cursor.m - 1 + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() + 1 })
  }

  const recent = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="screen">
      <div className="cal-head">
        <button type="button" className="btn small" onClick={() => move(-1)}>
          ‹
        </button>
        <b>{formatMonth(cursor.y, cursor.m)}</b>
        <button type="button" className="btn small" onClick={() => move(1)} disabled={cursor.y * 12 + cursor.m >= Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7))}>
          ›
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="cal-grid">
        {WD.map((w) => (
          <div key={w} className="wd">
            {w}
          </div>
        ))}
        {cells.map((key, i) => {
          if (!key) return <div key={'e' + i} className="cal-cell empty" />
          const e = byDate.get(key)
          const first = e?.feelings[0]
          const cls = [
            'cal-cell',
            e && 'has',
            e && !first && 'quiet',
            first?.intense && 'intense',
            key === today && 'today',
            isFuture(key) && 'future',
          ]
            .filter(Boolean)
            .join(' ')
          const style = first ? ({ '--q': QUADRANT_COLORS[first.quadrant] } as CSSProperties) : undefined
          return (
            <div key={key} className={cls} style={style} onClick={() => !isFuture(key) && onOpen(key)} title={first?.word}>
              {Number(key.slice(8))}
            </div>
          )
        })}
      </div>
      <div className="legend">
        {QUADRANTS.map((q) => (
          <span key={q.key}>
            <i style={{ background: QUADRANT_COLORS[q.key] }} />
            {q.label}
          </span>
        ))}
      </div>

      <div className="entry-list">
        {recent.length === 0 && <div className="empty">这个月还没有记录</div>}
        {recent.map((e) => (
          <div key={e.date} className="entry-item" onClick={() => onOpen(e.date)}>
            <div className="d">
              {formatShort(e.date)} · {e.feelings.map((f) => (f.intense ? '很' : '') + f.word).join('、') || '平淡的一天'}
            </div>
            <div className="t">{e.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
