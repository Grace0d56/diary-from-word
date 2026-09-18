import { useState } from 'react'
import type { Entry, Settings, Tone, User } from '../../shared/types'
import { api } from '../api'
import { formatShort } from '../lib/date'

interface Props {
  user: User
  onSettings: (patch: Partial<Settings>) => void
  onLogout: () => void
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function toMarkdown(entries: Entry[]): string {
  return entries
    .filter((e) => e.text)
    .map((e) => {
      const words = [
        ...e.feelings.map((f) => (f.intense ? '很' : '') + f.word),
        ...e.activities.map((a) => (a === e.star ? `★${a}` : a)),
        ...e.people,
      ].join(' · ')
      return `## ${e.date} ${formatShort(e.date)}\n\n${words}\n\n${e.text}\n`
    })
    .join('\n')
}

export function SettingsScreen({ user, onSettings, onLogout }: Props) {
  const [busy, setBusy] = useState(false)
  const s = user.settings

  async function exportAs(kind: 'json' | 'md') {
    setBusy(true)
    try {
      const entries = await api.listEntries('1970-01-01', '2999-12-31')
      const stamp = new Date().toISOString().slice(0, 10)
      if (kind === 'json') download(`几个词-${stamp}.json`, JSON.stringify(entries, null, 2), 'application/json')
      else download(`几个词-${stamp}.md`, toMarkdown(entries), 'text/markdown')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen settings">
      <div className="row">
        <div className="l">
          你好，{user.name}
          <small>邀请码登录，只有你能看到自己的记录</small>
        </div>
        <button type="button" className="linkbtn" onClick={onLogout}>
          退出
        </button>
      </div>

      <div className="row">
        <div className="l">
          日记语气
          <small>平实：像给自己记的。温和：多一点体谅，不煽情。</small>
        </div>
        <div className="seg">
          {(['plain', 'warm'] as Tone[]).map((t) => (
            <button key={t} type="button" className={s.tone === t ? 'on' : ''} onClick={() => onSettings({ tone: t })}>
              {t === 'plain' ? '平实' : '温和'}
            </button>
          ))}
        </div>
      </div>

      <div className="row">
        <div className="l">
          导出
          <small>随时把全部记录存成文件</small>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn small" disabled={busy} onClick={() => exportAs('md')}>
            Markdown
          </button>
          <button type="button" className="btn small" disabled={busy} onClick={() => exportAs('json')}>
            JSON
          </button>
        </div>
      </div>

      <div className="row">
        <div className="l">
          自己加的词
          <small>
            {[...s.customFeelings.map((c) => c.word), ...s.customActivities, ...s.customPeople].join('、') || '还没有'}
          </small>
        </div>
        {(s.customFeelings.length || s.customActivities.length || s.customPeople.length) > 0 && (
          <button
            type="button"
            className="linkbtn"
            onClick={() => window.confirm('清空自己加的词？') && onSettings({ customFeelings: [], customActivities: [], customPeople: [] })}
          >
            清空
          </button>
        )}
      </div>

      <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 18 }}>
        你点的词和留的一句话会发给第三方大模型来写成文字，不会用于其他用途。日记存在云端，只有你的邀请码能打开。
      </p>
    </div>
  )
}
