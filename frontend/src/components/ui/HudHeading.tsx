import type { ReactNode } from 'react'

export function HudHeading({
  children,
  accent = 'cyan',
  className = '',
}: {
  children: ReactNode
  accent?: 'cyan' | 'orange'
  className?: string
}) {
  return (
    <h3
      className={[
        'hud-heading text-sm font-semibold text-white',
        accent === 'orange' ? 'hud-heading-orange' : '',
        className,
      ].join(' ')}
    >
      {children}
    </h3>
  )
}
