import type { EntryInput } from '../../shared/types'
import { Summary } from './Summary'

interface Props {
  input: EntryInput
  onChange: (input: EntryInput) => void
  onBack: () => void
  onGenerate: () => void
}

const MAX = 60

export function NoteStep({ input, onChange, onBack, onGenerate }: Props) {
  return (
    <div className="screen">
      <h2 className="step-title">有一件事想记下来吗？</h2>
      <p className="step-hint">几个字就够。可以用键盘上的语音。不写也行。</p>
      <textarea
        className="textline"
        rows={2}
        maxLength={MAX}
        placeholder="比如：终于结束了 / 她今天没回消息"
        value={input.note}
        onChange={(e) => onChange({ ...input, note: e.target.value })}
      />
      <div className="counter">
        {input.note.length}/{MAX}
      </div>

      <div className="section">
        <h3>今天选的</h3>
        <Summary input={input} />
      </div>

      <div className="footer">
        <button type="button" className="btn quiet" onClick={onBack}>
          上一步
        </button>
        <button type="button" className="btn primary" onClick={onGenerate}>
          写成日记
        </button>
      </div>
    </div>
  )
}
