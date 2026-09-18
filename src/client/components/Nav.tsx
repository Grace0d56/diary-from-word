export type Tab = 'today' | 'calendar' | 'settings'

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'today', icon: '◑', label: '今天' },
  { key: 'calendar', icon: '▦', label: '日历' },
  { key: 'settings', icon: '⚙', label: '设置' },
]

export function Nav({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <nav className="nav">
      <div className="nav-inner">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={tab === t.key ? 'on' : ''} onClick={() => onTab(t.key)}>
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
