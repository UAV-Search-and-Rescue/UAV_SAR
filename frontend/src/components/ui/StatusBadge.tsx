import type { ReactNode } from 'react'

const tones = {
  cyan: [
    'bg-cyan-500/10 text-cyan-300 border-cyan-400/40',
    'shadow-[0_0_12px_rgba(56,189,248,0.28)]',
    'drop-shadow-[0_0_8px_rgba(56,189,248,0.6)] neon-pulse',
  ].join(' '),
  orange: [
    'bg-orange-500/10 text-orange-300 border-orange-400/40',
    'shadow-[0_0_12px_rgba(249,115,22,0.28)]',
    'drop-shadow-[0_0_8px_rgba(249,115,22,0.6)] neon-pulse-orange',
  ].join(' '),
  green: [
    'bg-emerald-500/10 text-emerald-300 border-emerald-400/40',
    'shadow-[0_0_12px_rgba(52,211,153,0.28)]',
    'drop-shadow-[0_0_8px_rgba(52,211,153,0.6)] neon-pulse',
  ].join(' '),
  slate: [
    'bg-slate-950/40 text-cyan-100 border-cyan-400/35',
    'shadow-[0_0_14px_rgba(56,189,248,0.22)]',
    'backdrop-blur-md',
  ].join(' '),
} as const

export function StatusBadge({
  tone = 'cyan',
  children,
  className = '',
}: {
  tone?: keyof typeof tones
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'font-mono text-[10px] font-medium uppercase tracking-wide',
        tones[tone],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
