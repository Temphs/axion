import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { InfoTip } from './InfoTip'

// KPI card: a muted label, the number set large with its change against the
// previous period printed inline beside it, and a gradient icon tile anchored
// top-right. `delta` is a fraction (0.12 = +12%); `invert` marks metrics where
// an increase is bad (e.g. cost), so the colour follows meaning, not sign.
export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  delta,
  deltaSuffix = '%',
  invert = false,
  tone = 'neutral',
  tooltip,
}: {
  icon?: LucideIcon
  label: string
  value: string
  sub?: string
  delta?: number | null
  deltaSuffix?: string
  invert?: boolean
  tone?: 'pos' | 'neg' | 'neutral'
  tooltip?: string
}) {
  const valueCls = tone === 'pos' ? 'text-emerald-600' : tone === 'neg' ? 'text-red-500' : 'text-slate-900'

  let deltaEl: React.ReactNode = null
  if (delta !== undefined && delta !== null && Number.isFinite(delta)) {
    const up = delta >= 0
    const good = invert ? !up : up
    deltaEl = (
      <span
        className={`shrink-0 text-sm font-bold tabular-nums ${good ? 'text-emerald-600' : 'text-red-500'}`}
        title="Μεταβολή σε σχέση με την προηγούμενη περίοδο"
      >
        {up ? '+' : '−'}
        {Math.abs(delta * 100).toFixed(1)}
        {deltaSuffix}
      </span>
    )
  }

  return (
    <Card className="flex items-start justify-between gap-2 p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(15,23,42,0.06),0_24px_48px_-24px_rgba(37,99,235,0.3)]">
      <div className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[13px] font-medium leading-snug text-slate-500">
          <span>{label}</span>
          {tooltip && <InfoTip text={tooltip} />}
        </span>
        <p className="mt-1.5 flex items-baseline gap-2">
          <span className={`font-display text-[1.6rem] font-bold leading-none tabular-nums tracking-tight ${valueCls}`}>
            {value}
          </span>
          {deltaEl}
        </p>
        {sub && <p className="mt-1.5 text-xs leading-snug text-balance text-slate-400">{sub}</p>}
      </div>

      {Icon && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_4px_12px_-2px_rgba(37,99,235,0.5)]">
          <Icon size={20} strokeWidth={2} />
        </span>
      )}
    </Card>
  )
}
