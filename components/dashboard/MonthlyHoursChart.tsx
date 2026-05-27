'use client'

import { hrs } from '@/lib/format'

type Point = { label: string; hours: number }

// Detailed monthly bar chart: a bar per month with its value on top and the
// month label below. Renders immediately (no scroll-reveal) and shows gridlines.
export function MonthlyHoursChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return <p className="py-10 text-center text-sm text-slate-400">Δεν υπάρχουν δεδομένα.</p>
  }
  const max = Math.max(...data.map((d) => d.hours), 1)
  const avg = data.reduce((s, d) => s + d.hours, 0) / data.length
  const peak = data.reduce((a, b) => (b.hours > a.hours ? b : a))

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span>Μ.Ο.: <span className="font-semibold text-slate-700">{hrs(avg)}/μήνα</span></span>
        <span>Μέγιστο: <span className="font-semibold text-slate-700">{hrs(peak.hours)}</span> ({peak.label})</span>
      </div>

      <div className="relative h-48">
        {/* gridlines */}
        {[1, 0.75, 0.5, 0.25, 0].map((g) => (
          <div key={g} className="absolute inset-x-0 flex items-center gap-2" style={{ top: `${(1 - g) * 100}%` }}>
            <span className="w-9 shrink-0 text-right text-[9px] text-slate-300">{Math.round(max * g)}</span>
            <span className="h-px flex-1 bg-slate-100" />
          </div>
        ))}
        {/* bars */}
        <div className="absolute inset-0 flex items-stretch gap-1 pl-11">
          {data.map((d, i) => {
            const isPeak = d.hours === peak.hours && d.hours > 0
            return (
              <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end" title={`${d.label}: ${d.hours.toFixed(1)} ώρες`}>
                <span className={'mb-0.5 text-[9px] font-semibold transition ' + (isPeak ? 'text-amber-600 opacity-100' : 'text-stone-500 opacity-0 group-hover:opacity-100')}>
                  {Math.round(d.hours)}
                </span>
                <div
                  className={
                    'w-full max-w-[26px] rounded-t transition-colors ' +
                    (isPeak
                      ? 'bg-gradient-to-t from-amber-500 to-amber-300 shadow-[0_0_0_1px_rgba(217,119,6,0.15)]'
                      : 'bg-gradient-to-t from-blue-600 to-blue-400 group-hover:from-blue-700 group-hover:to-blue-500')
                  }
                  style={{ height: `${Math.max(2, (d.hours / max) * 100)}%` }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* month labels */}
      <div className="mt-1.5 flex gap-1 pl-11">
        {data.map((d, i) => (
          <span key={i} className="flex-1 truncate text-center text-[9px] text-slate-400">{d.label}</span>
        ))}
      </div>
    </div>
  )
}
