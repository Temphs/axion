import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { Sparkline } from '@/components/axion/charts'
import { InfoTip } from './InfoTip'

// KPI card: plain label, large value, optional % change vs previous period,
// a formula tooltip and a small trend sparkline. `delta` is a fraction
// (0.12 = +12%); `invert` marks metrics where an increase is bad (e.g. cost).
export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  delta,
  invert = false,
  tone = 'neutral',
  tooltip,
  spark,
}: {
  icon?: LucideIcon
  label: string
  value: string
  sub?: string
  delta?: number | null
  invert?: boolean
  tone?: 'pos' | 'neg' | 'neutral'
  tooltip?: string
  spark?: number[]
}) {
  const valueCls = tone === 'pos' ? 'text-emerald-600' : tone === 'neg' ? 'text-red-500' : 'text-slate-900'

  let deltaEl: React.ReactNode = null
  if (delta !== undefined && delta !== null && Number.isFinite(delta)) {
    const up = delta >= 0
    const good = invert ? !up : up
    const Arrow = up ? TrendingUp : TrendingDown
    deltaEl = (
      <span
        className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums ${
          good ? 'text-emerald-600' : 'text-red-500'
        }`}
        title="Μεταβολή σε σχέση με την προηγούμενη περίοδο"
      >
        <Arrow size={13} />
        {up ? '+' : ''}
        {(delta * 100).toFixed(1)}%
      </span>
    )
  }

  const showSpark = spark && spark.length >= 2 && spark.some((v) => v !== spark[0])

  return (
    <Card className="p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(15,23,42,0.06),0_24px_48px_-24px_rgba(37,99,235,0.3)]">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-slate-500">
          {Icon && <Icon size={15} className="shrink-0 text-slate-400" strokeWidth={2} />}
          <span className="truncate">{label}</span>
          {tooltip && <InfoTip text={tooltip} />}
        </span>
        {deltaEl}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className={`font-display text-[1.6rem] font-semibold leading-none tabular-nums tracking-tight ${valueCls}`}>
          {value}
        </p>
        {showSpark && (
          <div className="hidden w-20 shrink-0 opacity-80 sm:block">
            <Sparkline data={spark} stroke={tone === 'neg' ? '#ef4444' : '#2563EB'} immediate />
          </div>
        )}
      </div>
      {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
    </Card>
  )
}
