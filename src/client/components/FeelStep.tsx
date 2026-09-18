import { useState, type CSSProperties } from 'react'
import type { EntryInput, Quadrant, Settings } from '../../shared/types'
import { MAX_FEELINGS, QUADRANTS, QUADRANT_COLORS, VISIBLE_PER_QUADRANT } from '../data/vocab'
import { Chip } from './Chip'

interface Props {
  input: EntryInput
  settings: Settings
  onChange: (input: EntryInput) => void
  onAddCustom: (word: string, quadrant: Quadrant) => void
  onNext: () => void
  onQuiet: () => void
}

export function FeelStep({ input, settings, onChange, onAddCustom, onNext, onQuiet }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  function tap(word: string, quadrant: Quadrant) {
    const idx = input.feelings.findIndex((f) => f.word === word)
    let feelings = [...input.feelings]
    if (idx === -1) {
      if (feelings.length >= MAX_FEELINGS) return
      feelings.push({ word, quadrant, intense: false })
    } else if (!feelings[idx].intense) {
      feelings[idx] = { ...feelings[idx], intense: true }
    } else {
      feelings.splice(idx, 1)
    }
    // Drop links whose feeling is gone.
    const links = input.links.filter((l) => feelings.some((f) => f.word === l.feeling))
    onChange({ ...input, feelings, links, quiet: false })
  }

  function addCustom(quadrant: Quadrant) {
    const word = window.prompt('加一个词（2 到 6 个字）')?.trim()
    if (!word || word.length > 6) return
    onAddCustom(word, quadrant)
    if (input.feelings.length < MAX_FEELINGS && !input.feelings.some((f) => f.word === word)) {
      onChange({ ...input, feelings: [...input.feelings, { word, quadrant, intense: false }], quiet: false })
    }
  }

  const full = input.feelings.length >= MAX_FEELINGS

  return (
    <div className="screen">
      <h2 className="step-title">今天是什么感受？</h2>
      <p className="step-hint">最多选 {MAX_FEELINGS} 个。点两下表示「很」，第三下取消。</p>

      {QUADRANTS.map((q) => {
        const custom = settings.customFeelings.filter((c) => c.quadrant === q.key).map((c) => c.word)
        const all = [...q.words, ...custom]
        const isOpen = expanded[q.key]
        const words = isOpen
          ? all
          : all.filter((w, i) => i < VISIBLE_PER_QUADRANT || input.feelings.some((f) => f.word === w))
        return (
          <section key={q.key} className="quadrant" style={{ '--q': QUADRANT_COLORS[q.key] } as CSSProperties}>
            <header>
              <b>{q.label}</b>
              <span>{q.hint}</span>
            </header>
            <div className="chips">
              {words.map((w) => {
                const pick = input.feelings.find((f) => f.word === w)
                return (
                  <Chip
                    key={w}
                    on={!!pick}
                    intense={pick?.intense}
                    color={QUADRANT_COLORS[q.key]}
                    disabled={!pick && full}
                    onClick={() => tap(w, q.key)}
                  >
                    {w}
                  </Chip>
                )
              })}
              <Chip ghost onClick={() => setExpanded({ ...expanded, [q.key]: !isOpen })}>
                {isOpen ? '收起' : '更多'}
              </Chip>
              {isOpen && (
                <Chip ghost onClick={() => addCustom(q.key)}>
                  + 自己加
                </Chip>
              )}
            </div>
          </section>
        )
      })}

      <div className="footer">
        <button type="button" className="btn quiet" onClick={onQuiet}>
          平淡的一天
        </button>
        <button type="button" className="btn primary" disabled={input.feelings.length === 0} onClick={onNext}>
          下一步
        </button>
      </div>
    </div>
  )
}
