import type { EntryInput } from '../../shared/types'
import { QUADRANT_COLORS } from '../data/vocab'
import { Chip } from './Chip'

/** Read-only row of the day's picked words. The words are the record; the prose is the mirror. */
export function Summary({ input }: { input: EntryInput }) {
  return (
    <div className="summary">
      {input.quiet && <Chip>平淡的一天</Chip>}
      {input.feelings.map((f) => (
        <Chip key={f.word} on intense={f.intense} color={QUADRANT_COLORS[f.quadrant]}>
          {f.word}
        </Chip>
      ))}
      {input.activities.map((a) => (
        <Chip key={a} star={input.star === a}>
          {input.star === a ? '★ ' : ''}
          {a}
        </Chip>
      ))}
      {input.people.map((p) => (
        <Chip key={'p' + p}>{p}</Chip>
      ))}
      {input.links.map((l) => (
        <Chip key={'l' + l.feeling} ghost>
          {l.feeling} ← {l.cause}
        </Chip>
      ))}
      {input.note.trim() && <Chip ghost>「{input.note.trim()}」</Chip>}
    </div>
  )
}
