import type { LucideIcon } from 'lucide-react'
import { BarChart3, Bell, Radar, ScanSearch } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  hint: string
  icon: LucideIcon
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    to: '/mission',
    label: 'Mission Control',
    hint: 'Simulated Grid',
    icon: Radar,
  },
  {
    to: '/stream',
    label: 'AI Stream',
    hint: 'Dual-Stream Fusion',
    icon: ScanSearch,
  },
  {
    to: '/alerts',
    label: 'Alerts',
    hint: 'Rescue Target Center',
    icon: Bell,
  },
  {
    to: '/metrics',
    label: 'Evaluation',
    hint: 'Metrics & Alignment',
    icon: BarChart3,
  },
]
