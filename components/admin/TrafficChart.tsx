'use client'

import { useState } from 'react'

// Page views per day: one series, so one hue and no legend (the card title
// names it). Bars sit on the baseline with rounded tops and a 2px gap; every
// day has a hover/focus target the full height of the plot, and the same
// numbers are available as a table.

const nf = new Intl.NumberFormat('en-GB')
const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function niceMax(value: number): number {
  if (value <= 4) return 4
  const magnitude = 10 ** Math.floor(Math.log10(value))
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) if (value <= step * magnitude) return step * magnitude
  return 10 * magnitude
}

export function TrafficChart({ days }: { days: { day: string; views: number }[] }) {
  const [active, setActive] = useState<number | null>(null)
  const max = niceMax(Math.max(0, ...days.map((d) => d.views)))
  const shown = active !== null ? days[active] : null

  return (
    <div className="mt-3">
      <div className="relative h-44" onMouseLeave={() => setActive(null)}>
        {/* Recessive gridlines with axis labels */}
        {[1, 0.5, 0].map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center gap-2" style={{ top: `${(1 - t) * 100}%` }}>
            <span className="w-8 shrink-0 -translate-y-1/2 text-right text-[10px] tabular-nums text-slate-400">{nf.format(max * t)}</span>
            <span className="h-px flex-1 -translate-y-1/2 bg-slate-100" />
          </div>
        ))}

        <div className="absolute inset-y-0 left-10 right-0 flex items-end gap-[2px]">
          {days.map((d, i) => (
            <button
              key={d.day}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${dayLabel(d.day)}: ${nf.format(d.views)} page views`}
              className="flex h-full flex-1 cursor-default items-end outline-none focus-visible:bg-slate-50"
            >
              <span
                className={`block w-full rounded-t-[4px] transition-colors ${active === i ? 'bg-blue-700' : 'bg-blue-600'}`}
                style={{ height: d.views > 0 ? `max(2px, ${(d.views / max) * 100}%)` : 0 }}
              />
            </button>
          ))}
        </div>

        {shown && active !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-white shadow-lg"
            style={{ left: `calc(2.5rem + (100% - 2.5rem) * ${(active + 0.5) / days.length})` }}
          >
            <p className="text-[10px] text-slate-300">{dayLabel(shown.day)}</p>
            <p className="text-sm font-bold">{nf.format(shown.views)} views</p>
          </div>
        )}
      </div>

      {/* Sparse x-axis: first, middle and last day */}
      <div className="ml-10 mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{dayLabel(days[0].day)}</span>
        <span>{dayLabel(days[Math.floor(days.length / 2)].day)}</span>
        <span>{dayLabel(days[days.length - 1].day)}</span>
      </div>

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Show as table</summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <thead>
            <tr className="text-slate-500">
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 text-right font-medium">Page views</th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d.day} className="border-t border-slate-100">
                <td className="py-1 text-slate-700">{dayLabel(d.day)}</td>
                <td className="py-1 text-right tabular-nums text-slate-900">{nf.format(d.views)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
