import type { CSSProperties } from 'react'
import type { EntryInput } from '../../shared/types'
import { CAUSE_OTHER, CAUSE_UNSURE } from '../../shared/types'
import { QUADRANT_COLORS } from '../data/vocab'
import { Chip } from './Chip'

interface Props {
  input: EntryInput
  onChange: (input: EntryInput) => void
  onBack: () => void
  onNext: () => void
}

export function ConnectStep({ input, onChange, onBack, onNext }: Props) {
  const causes = [...input.activities, ...input.people.filter((p) => p !== '一个人'), CAUSE_OTHER, CAUSE_UNSURE]

  function pick(feeling: string, cause: string) {
    const current = input.links.find((l) => l.feeling === feeling)
    const links = input.links.filter((l) => l.feeling !== feeling)
    if (!current || current.cause !== cause) links.push({ feeling, cause })
    onChange({ ...input, links })
  }

  return (
    <div className="screen">
      <h2 className="step-title">是因为什么？</h2>
      <p className="step-hint">给每个感受点一个原因。不想说就跳过。</p>

      {input.feelings.map((f) => {
        const current = input.links.find((l) => l.feeling === f.word)?.cause
        return (
          <div key={f.word} className="connect-row" style={{ '--q': QUADRANT_COLORS[f.quadrant] } as CSSProperties}>
            <div className="who">
              <em>{f.intense ? '很' : ''}{f.word}</em>，是因为…
            </div>
            <div className="chips">
              {causes.map((c) => (
                <Chip key={c} on={current === c} color={QUADRANT_COLORS[f.quadrant]} onClick={() => pick(f.word, c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </div>
        )
      })}

      <div className="footer">
        <button type="button" className="btn quiet" onClick={onBack}>
          上一步
        </button>
        <button type="button" className="btn primary" onClick={onNext}>
          {input.links.length ? '下一步' : '跳过'}
        </button>
      </div>
    </div>
  )
}
