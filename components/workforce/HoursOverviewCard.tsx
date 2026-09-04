import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { num } from '@/lib/format'
import type { TrendPoint } from '@/lib/profitability'
import { HoursBars } from './HoursBars'

// Rounds an axis maximum up to a readable tick value (250, 500, 1.000 …), so
// the gridline labels are round numbers rather than the raw data maximum.
function niceMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  for (const step of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
    if (value <= step * magnitude) return step * magnitude
  }
  return 10 * magnitude
}

export type HoursStat = { icon: LucideIcon; label: string; value: string }

// Hours logged per month, drawn as bars on a dark panel, with the period's
// headline counts spelled out underneath.
export function HoursOverviewCard({
  data,
  caption,
  deltaPct,
  stats,
}: {
  data: TrendPoint[]
  caption: string
  deltaPct: number | null
  stats: HoursStat[]
}) {
  const max = niceMax(Math.max(...data.map((d) => d.hours), 0))
  const ticks = [1, 0.75, 0.5, 0.25, 0]

  return (
    <Card className="p-4">
      {/* Dark panel: the chart itself */}
      <div className="relative rounded-xl bg-gradient-to-br from-[#1f2a4d] via-[#1b2749] to-[#141d38] p-5 shadow-[0_12px_28px_-14px_rgba(15,23,42,0.7)]">
        <div className="relative h-48">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 flex items-center gap-3" style={{ top: `${(1 - t) * 100}%` }}>
              <span className="w-10 shrink-0 text-right text-[10px] font-medium tabular-nums text-white/45">
                {num(Math.round(max * t))}
              </span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
          ))}
          <HoursBars data={data.map((d) => ({ month: d.month, label: d.label, hours: d.hours }))} max={max} />
        </div>
        <div className="mt-2 flex gap-1.5 pl-13">
          {data.map((d) => (
            <span key={d.month} className="flex-1 truncate text-center text-[10px] text-white/45">
              {d.label}
            </span>
          ))}
        </div>
      </div>

      {/* Headline + per-metric chips, mirroring the panel above */}
      <div className="px-1 pt-4">
        <h2 className="font-display text-base font-bold tracking-tight text-slate-900">Ώρες εργασίας</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          {deltaPct !== null && (
            <span className={`font-semibold ${deltaPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              ({deltaPct >= 0 ? '+' : '−'}
              {Math.abs(deltaPct).toFixed(0)}%){' '}
            </span>
          )}
          {caption}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="min-w-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_3px_8px_-2px_rgba(37,99,235,0.55)]">
                <Icon size={14} strokeWidth={2.25} />
              </span>
              <p className="mt-2 truncate text-[11px] font-medium text-slate-400">{label}</p>
              <p className="font-display truncate text-sm font-bold tabular-nums text-slate-900">{value}</p>
              <span className="mt-1.5 block h-px bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
