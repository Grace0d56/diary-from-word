import { useEffect, useState } from 'react'
import type { Entry, EntryInput, Quadrant, Settings } from '../../shared/types'
import { api } from '../api'
import { local } from '../lib/local'
import { ConnectStep } from './ConnectStep'
import { DoStep } from './DoStep'
import { FeelStep } from './FeelStep'
import { NoteStep } from './NoteStep'
import { Summary } from './Summary'

interface Props {
  date: string
  initial: EntryInput
  settings: Settings
  onSettings: (patch: Partial<Settings>) => void
  onDone: (entry: Entry) => void
  onCancel?: () => void
}

const STEPS = 4

export function Flow({ date, initial, settings, onSettings, onDone, onCancel }: Props) {
  const [input, setInput] = useState<EntryInput>(initial)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    local.setInput(date, input)
  }, [date, input])

  async function generate(next: EntryInput = input) {
    setBusy(true)
    setError(null)
    try {
      const entry = await api.generate(next)
      local.setInput(date, null)
      onDone(entry)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  function quiet() {
    const next: EntryInput = { ...input, quiet: true, feelings: [], links: [] }
    setInput(next)
    setStep(3)
  }

  function addCustomFeeling(word: string, quadrant: Quadrant) {
    if (settings.customFeelings.some((c) => c.word === word)) return
    onSettings({ customFeelings: [...settings.customFeelings, { word, quadrant }] })
  }

  function addCustom(kind: 'activity' | 'person', word: string) {
    if (kind === 'activity' && !settings.customActivities.includes(word))
      onSettings({ customActivities: [...settings.customActivities, word] })
    if (kind === 'person' && !settings.customPeople.includes(word))
      onSettings({ customPeople: [...settings.customPeople, word] })
  }

  if (busy) {
    return (
      <div className="loading">
        <Summary input={input} />
        <p>正在把这几个词写成日记…</p>
      </div>
    )
  }

  return (
    <>
      <div className="dots" aria-hidden>
        {Array.from({ length: STEPS }, (_, i) => (
          <i key={i} className={i <= step ? 'on' : ''} />
        ))}
        {onCancel && (
          <button type="button" className="linkbtn" style={{ marginLeft: 'auto' }} onClick={onCancel}>
            取消
          </button>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      {step === 0 && (
        <FeelStep
          input={input}
          settings={settings}
          onChange={setInput}
          onAddCustom={addCustomFeeling}
          onNext={() => setStep(1)}
          onQuiet={quiet}
        />
      )}
      {step === 1 && (
        <DoStep
          input={input}
          settings={settings}
          onChange={setInput}
          onAddCustom={addCustom}
          onBack={() => setStep(0)}
          onNext={() => setStep(input.feelings.length && (input.activities.length || input.people.length) ? 2 : 3)}
        />
      )}
      {step === 2 && <ConnectStep input={input} onChange={setInput} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && (
        <NoteStep
          input={input}
          onChange={setInput}
          onBack={() => setStep(input.quiet ? 0 : input.links.length || (input.feelings.length && input.activities.length) ? 2 : 1)}
          onGenerate={() => generate()}
        />
      )}
    </>
  )
}
