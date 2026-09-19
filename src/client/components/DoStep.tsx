import type { EntryInput, Settings } from '../../shared/types'
import { ACTIVITIES, PEOPLE } from '../data/vocab'
import { Chip } from './Chip'

interface Props {
  input: EntryInput
  settings: Settings
  onChange: (input: EntryInput) => void
  onAddCustom: (kind: 'activity' | 'person', word: string) => void
  onBack: () => void
  onNext: () => void
}

function toggle(list: string[], word: string): string[] {
  return list.includes(word) ? list.filter((w) => w !== word) : [...list, word]
}

export function DoStep({ input, settings, onChange, onAddCustom, onBack, onNext }: Props) {
  const activities = [...ACTIVITIES, ...settings.customActivities]
  const people = [...PEOPLE, ...settings.customPeople]

  function tapActivity(word: string) {
    const next = toggle(input.activities, word)
    const star = next.includes(input.star ?? '') ? input.star : null
    // Drop "because of X" links when X is deselected.
    const links = input.links.filter((l) => l.cause !== word || next.includes(word))
    onChange({ ...input, activities: next, star, links })
  }

  function tapPerson(word: string) {
    let next = toggle(input.people, word)
    // "一个人" excludes everyone else.
    if (word === '一个人' && next.includes('一个人')) next = ['一个人']
    else next = next.filter((p) => p !== '一个人' || word === '一个人')
    onChange({ ...input, people: next })
  }

  function addCustom(kind: 'activity' | 'person') {
    const word = window.prompt(kind === 'activity' ? '加一件事（2 到 8 个字）' : '加一个人（比如名字、昵称）')?.trim()
    if (!word || word.length > 8) return
    onAddCustom(kind, word)
    if (kind === 'activity') onChange({ ...input, activities: [...input.activities, word] })
    else onChange({ ...input, people: [...input.people, word] })
  }

  const nothing = input.activities.length === 0 && input.people.length === 0

  return (
    <div className="screen">
      <h2 className="step-title">做了什么？</h2>
      <p className="step-hint">随便点几个。都不点也行。</p>

      <div className="chips">
        {activities.map((w) => (
          <Chip key={w} on={input.activities.includes(w)} onClick={() => tapActivity(w)}>
            {w}
          </Chip>
        ))}
        <Chip ghost onClick={() => addCustom('activity')}>
          + 自己加
        </Chip>
      </div>

      {input.activities.length > 1 && (
        <div className="section">
          <h3>
            今天主要是关于？<small>选一个当主角，可不选</small>
          </h3>
          <div className="chips">
            {input.activities.map((w) => (
              <Chip key={w} star={input.star === w} onClick={() => onChange({ ...input, star: input.star === w ? null : w })}>
                {input.star === w ? '★ ' : ''}
                {w}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <h3>和谁</h3>
        <div className="chips">
          {people.map((w) => (
            <Chip key={w} on={input.people.includes(w)} onClick={() => tapPerson(w)}>
              {w}
            </Chip>
          ))}
          <Chip ghost onClick={() => addCustom('person')}>
            + 自己加
          </Chip>
        </div>
      </div>

      <div className="footer">
        <button type="button" className="btn quiet" onClick={onBack}>
          上一步
        </button>
        <button type="button" className="btn primary" onClick={onNext}>
          {nothing ? '跳过' : '下一步'}
        </button>
      </div>
    </div>
  )
}
