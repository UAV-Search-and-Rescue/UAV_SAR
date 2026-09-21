import type { ReactNode } from 'react'

const hoverAccent = {
  cyan: 'hover:border-cyan-400/80 hover:shadow-[0_20px_50px_rgba(56,189,248,0.22),0_0_28px_rgba(56,189,248,0.28)]',
  orange: 'hover:border-orange-500/80 hover:shadow-[0_20px_50px_rgba(249,115,22,0.2),0_0_28px_rgba(249,115,22,0.26)]',
  none: '',
} as const

const borderAccent = {
  cyan: 'border-cyan-400/45 hud-frame shadow-[0_20px_50px_rgba(8,112,184,0.16),0_0_22px_rgba(56,189,248,0.16),inset_0_1px_0_0_rgba(255,255,255,0.12)]',
  orange: 'border-orange-500/50 hud-frame hud-frame-orange shadow-[0_20px_50px_rgba(154,52,18,0.16),0_0_22px_rgba(249,115,22,0.16),inset_0_1px_0_0_rgba(255,255,255,0.1)]',
  none: 'border-cyan-400/30 hud-frame',
} as const

export function GlassPanel({
  children,
  className = '',
  accent = 'cyan',
  lift = true,
  as: Tag = 'section',
}: {
  children: ReactNode
  className?: string
  accent?: keyof typeof hoverAccent
  lift?: boolean
  as?: 'section' | 'article' | 'aside' | 'label' | 'li' | 'div'
}) {
  return (
    <Tag
      className={[
        'relative rounded-xl border bg-slate-950/55 backdrop-blur-2xl',
        'transition-all duration-300',
        borderAccent[accent],
        lift ? `hover:-translate-y-1 ${hoverAccent[accent]}` : hoverAccent[accent],
        className,
      ].join(' ')}
    >
      {children}
    </Tag>
  )
}
