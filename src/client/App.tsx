import { useCallback, useEffect, useState } from 'react'
import type { Entry, EntryInput, Settings, User } from '../shared/types'
import { emptyInput } from '../shared/types'
import { api } from './api'
import { Calendar } from './components/Calendar'
import { DraftView } from './components/DraftView'
import { Flow } from './components/Flow'
import { Login } from './components/Login'
import { Nav, type Tab } from './components/Nav'
import { SettingsScreen } from './components/SettingsScreen'
import { formatShort, todayKey } from './lib/date'
import { local } from './lib/local'

export function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined) // undefined = checking
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(todayKey)
  const [entry, setEntry] = useState<Entry | null | undefined>(undefined)
  const [repick, setRepick] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Session
  useEffect(() => {
    if (!local.getCode()) {
      setUser(null)
      return
    }
    api
      .me()
      .then(setUser)
      .catch(() => {
        local.setCode(null)
        setUser(null)
      })
  }, [])

  async function login(code: string) {
    local.setCode(code)
    try {
      setUser(await api.me())
    } catch (e) {
      local.setCode(null)
      throw e
    }
  }

  function logout() {
    local.setCode(null)
    setUser(null)
    setEntry(undefined)
  }

  // Entry for the selected date
  const loadEntry = useCallback(async (d: string) => {
    setEntry(undefined)
    setLoadError(null)
    try {
      setEntry(await api.getEntry(d))
    } catch (e) {
      setLoadError((e as Error).message)
      setEntry(null)
    }
  }, [])

  useEffect(() => {
    if (user) loadEntry(date)
  }, [user, date, loadEntry])

  // Roll over the day if the app stays open past 4am.
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = todayKey()
      if (t !== date && date === todayKey(new Date(Date.now() - 60_000))) setDate(t)
    }, 60_000)
    return () => window.clearInterval(id)
  }, [date])

  async function patchSettings(patch: Partial<Settings>) {
    if (!user) return
    const optimistic = { ...user, settings: { ...user.settings, ...patch } }
    setUser(optimistic)
    try {
      setUser(await api.updateSettings(optimistic.settings))
    } catch {
      /* keep optimistic */
    }
  }

  function open(d: string) {
    setDate(d)
    setRepick(false)
    setTab('today')
  }

  if (user === undefined) return <div className="app" />
  if (user === null)
    return (
      <div className="app">
        <Login onSubmit={login} />
      </div>
    )

  const isToday = date === todayKey()
  const hasText = !!entry?.text
  const flowInitial: EntryInput = (() => {
    if (entry && (repick || !hasText)) {
      const { draft, text, edited, question, answer, genCount, createdAt, updatedAt, ...input } = entry
      if (input.feelings.length || input.quiet || input.activities.length) return input
    }
    return local.getInput(date) ?? emptyInput(date)
  })()

  return (
    <div className="app">
      {tab === 'today' && (
        <>
          <div className="topbar">
            <h1>
              {isToday ? '今天' : formatShort(date)}
              {isToday && <span className="sub"> · {formatShort(date)}</span>}
            </h1>
            {!isToday && (
              <button type="button" className="linkbtn" onClick={() => open(todayKey())}>
                回到今天
              </button>
            )}
          </div>
          {loadError && <div className="error">{loadError}</div>}
          {entry === undefined && !loadError && <div className="empty">…</div>}
          {entry !== undefined && hasText && !repick && (
            <DraftView
              entry={entry!}
              onEntry={setEntry}
              onRepick={() => setRepick(true)}
              onDeleted={() => {
                local.setInput(date, null)
                setEntry(null)
              }}
            />
          )}
          {entry !== undefined && (!hasText || repick) && (
            <Flow
              key={date + (repick ? '-repick' : '')}
              date={date}
              initial={flowInitial}
              settings={user.settings}
              onSettings={patchSettings}
              onDone={(e) => {
                setEntry(e)
                setRepick(false)
              }}
              onCancel={repick ? () => setRepick(false) : undefined}
            />
          )}
        </>
      )}
      {tab === 'calendar' && (
        <>
          <div className="topbar">
            <h1>日历</h1>
          </div>
          <Calendar onOpen={open} />
        </>
      )}
      {tab === 'settings' && (
        <>
          <div className="topbar">
            <h1>设置</h1>
          </div>
          <SettingsScreen user={user} onSettings={patchSettings} onLogout={logout} />
        </>
      )}
      <Nav tab={tab} onTab={setTab} />
    </div>
  )
}
