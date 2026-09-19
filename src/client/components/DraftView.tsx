import { useEffect, useRef, useState } from 'react'
import type { Adjust, Entry } from '../../shared/types'
import { api } from '../api'
import { Summary } from './Summary'

interface Props {
  entry: Entry
  onEntry: (entry: Entry) => void
  onRepick: () => void
  onDeleted: () => void
}

const ADJUSTS: { key: Adjust; label: string }[] = [
  { key: 'shorter', label: '短一点' },
  { key: 'warmer', label: '温柔一点' },
  { key: 'plainer', label: '平实一点' },
  { key: 'rewrite', label: '换个写法' },
]

export function DraftView({ entry, onEntry, onRepick, onDeleted }: Props) {
  const [text, setText] = useState(entry.text)
  const [status, setStatus] = useState<'saved' | 'dirty' | 'saving'>('saved')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    setText(entry.text)
    setStatus('saved')
  }, [entry.text, entry.updatedAt])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [text])

  function edit(value: string) {
    setText(value)
    setStatus('dirty')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => save(value), 900)
  }

  async function save(value: string) {
    setStatus('saving')
    try {
      const saved = await api.saveEntry(entry.date, { text: value, edited: value.trim() !== entry.draft.trim() })
      onEntry(saved)
      setStatus('saved')
    } catch (e) {
      setError((e as Error).message)
      setStatus('dirty')
    }
  }

  async function regenerate(extra: { adjust?: Adjust; answer?: string }, label: string) {
    setBusy(label)
    setError(null)
    try {
      const { draft, text: _t, edited: _e, question: _q, answer: _a, genCount: _g, createdAt: _c, updatedAt: _u, ...input } = entry
      const next = await api.generate(input, { ...extra, previousText: extra.adjust ? text : undefined })
      onEntry(next)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (!window.confirm('删掉这一天的记录？')) return
    await api.deleteEntry(entry.date)
    onDeleted()
  }

  const statusText = status === 'saved' ? (entry.edited ? '已保存 · 改过' : '已保存') : status === 'saving' ? '保存中…' : '有改动'

  return (
    <div className="screen">
      <Summary input={entry} />

      <textarea ref={ref} className="diary" value={text} onChange={(e) => edit(e.target.value)} spellCheck={false} />
      <div className="diary-meta">
        <span>{statusText}</span>
        <span>{busy ? `正在${busy}…` : '可以直接改'}</span>
      </div>

      <div className="adjust">
        {ADJUSTS.map((a) => (
          <button
            key={a.key}
            type="button"
            className="btn small"
            disabled={!!busy}
            onClick={() => regenerate({ adjust: a.key }, a.label)}
          >
            {a.label}
          </button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      {entry.question && !entry.answer && (
        <div className="card question">
          <p>{entry.question.text}</p>
          <div className="chips">
            {entry.question.options.map((o) => (
              <button key={o} type="button" className="chip" disabled={!!busy} onClick={() => regenerate({ answer: o }, '补充')}>
                {o}
              </button>
            ))}
            <button
              type="button"
              className="chip ghost"
              disabled={!!busy}
              onClick={async () => onEntry(await api.saveEntry(entry.date, { question: null }))}
            >
              跳过
            </button>
          </div>
        </div>
      )}

      <div className="footer" style={{ justifyContent: 'flex-start', gap: 18 }}>
        <button type="button" className="linkbtn" onClick={onRepick}>
          重新选词
        </button>
        <button type="button" className="linkbtn danger" onClick={remove}>
          删除这天
        </button>
      </div>
    </div>
  )
}
