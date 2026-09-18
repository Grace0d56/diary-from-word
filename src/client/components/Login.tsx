import { useState } from 'react'

interface Props {
  onSubmit: (code: string) => Promise<void>
}

export function Login({ onSubmit }: Props) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function go() {
    if (!code.trim()) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(code.trim())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <h1>几个词</h1>
      <p>点几个词，写成今天的日记。</p>
      <input
        placeholder="邀请码"
        value={code}
        autoFocus
        autoCapitalize="none"
        autoCorrect="off"
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && go()}
      />
      {error && <div className="error">{error}</div>}
      <button type="button" className="btn primary" disabled={busy || !code.trim()} onClick={go}>
        进入
      </button>
    </div>
  )
}
