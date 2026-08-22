'use client'

import { hrs, pct } from '@/lib/format'
import { hoursSplit } from '@/lib/profitability'

// A bar per month. When the caller supplies a billable/overhead split the bar
// is stacked in exactly two colours — client work at the bottom, overhead on
// top — so the shape of the month is readable without a legend lookup.
// Without a split it falls back to a single blue bar (client trends, where
// every hour belongs to that one client by definition).
type Point = {
  label: string
  hours: number
  billableHours?: number
  overheadHours?: number
}

const BILLABLE = '#2563EB'
const OVERHEAD = '#f59e0b'

export function MonthlyHoursChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return <p className="py-10 text-center text-sm text-slate-400">Δεν υπάρχουν δεδομένα.</p>
  }
  const max = Math.max(...data.map((d) => d.hours), 1)
  const avg = data.reduce((s, d) => s + d.hours, 0) / data.length
  const peak = data.reduce((a, b) => (b.hours > a.hours ? b : a))
  const stacked = data.some((d) => d.billableHours !== undefined || d.overheadHours !== undefined)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
        <span>Μ.Ο.: <span className="font-semibold text-slate-700">{hrs(avg)}/μήνα</span></span>
        <span>Μέγιστο: <span className="font-semibold text-slate-700">{hrs(peak.hours)}</span> ({peak.label})</span>
        {stacked && (
          <span className="flex items-center gap-3">
            <Swatch color={BILLABLE} label="Χρεώσιμες" />
            <Swatch color={OVERHEAD} label="Overhead" />
          </span>
        )}
      </div>

      <div className="relative h-48">
        {/* gridlines */}
        {[1, 0.75, 0.5, 0.25, 0].map((g) => (
          <div key={g} className="absolute inset-x-0 flex items-center gap-2" style={{ top: `${(1 - g) * 100}%` }}>
            <span className="w-9 shrink-0 text-right text-[10px] text-slate-400">{Math.round(max * g)}</span>
            <span className="h-px flex-1 bg-slate-100" />
          </div>
        ))}
        {/* bars */}
        <div className="absolute inset-0 flex items-stretch gap-1 pl-11">
          {data.map((d, i) => {
            const split = hoursSplit(d.billableHours ?? d.hours, d.overheadHours ?? 0)
            return (
              <div key={i} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                <Tooltip point={d} stacked={stacked} />
                <div
                  className="flex w-full max-w-[26px] flex-col justify-end overflow-hidden rounded-t transition-opacity group-hover:opacity-80"
                  style={{ height: `${Math.max(2, (d.hours / max) * 100)}%` }}
                >
                  {stacked && split.overheadHours > 0 && (
                    <div
                      style={{
                        background: OVERHEAD,
                        height: `${((split.overheadPct ?? 0) * 100).toFixed(2)}%`,
                      }}
                    />
                  )}
                  <div
                    style={{
                      background: BILLABLE,
                      height: stacked ? `${((split.billablePct ?? 1) * 100).toFixed(2)}%` : '100%',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* month labels */}
      <div className="mt-1.5 flex gap-1 pl-11">
        {data.map((d, i) => (
          <span key={i} className="flex-1 truncate text-center text-[10px] text-slate-500">{d.label}</span>
        ))}
      </div>
    </div>
  )
}

// Percentages are of that month's own total, so a quiet month still reads
// 100% and a month with no hours shows no percentages at all.
function Tooltip({ point, stacked }: { point: Point; stacked: boolean }) {
  const split = hoursSplit(point.billableHours ?? point.hours, point.overheadHours ?? 0)

  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-40 -translate-x-1/2 rounded-lg bg-slate-800 px-2.5 py-2 text-left text-[11px] leading-snug text-slate-100 opacity-0 shadow-lg transition group-hover:opacity-100">
      <span className="block font-semibold">{point.label}</span>
      <span className="block text-slate-300">Σύνολο: {hrs(point.hours)}</span>
      {stacked && (
        <>
          <span className="mt-1 flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: BILLABLE }} />
            Χρεώσιμες: {hrs(split.billableHours)}
            {split.billablePct !== null && <span className="text-slate-400">— {pct(split.billablePct)}</span>}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: OVERHEAD }} />
            Overhead: {hrs(split.overheadHours)}
            {split.overheadPct !== null && <span className="text-slate-400">— {pct(split.overheadPct)}</span>}
          </span>
        </>
      )}
    </span>
  )
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
