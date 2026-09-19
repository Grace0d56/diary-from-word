import type { CSSProperties, ReactNode } from 'react'

interface Props {
  on?: boolean
  intense?: boolean
  star?: boolean
  ghost?: boolean
  disabled?: boolean
  color?: string
  onClick?: () => void
  children: ReactNode
  title?: string
}

export function Chip({ on, intense, star, ghost, disabled, color, onClick, children, title }: Props) {
  const cls = ['chip', on && 'on', intense && 'intense', star && 'star', ghost && 'ghost', disabled && 'disabled']
    .filter(Boolean)
    .join(' ')
  const style = color ? ({ '--q': color, '--on-ink': '#1f1a15' } as CSSProperties) : undefined
  return (
    <button type="button" className={cls} style={style} onClick={onClick} title={title}>
      {intense && on ? '很' : ''}
      {children}
    </button>
  )
}
