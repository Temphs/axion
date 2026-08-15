'use client'

import { motion } from 'framer-motion'
import { eur } from '@/lib/format'
import type { TrendPoint } from '@/lib/profitability'

// Monthly profitability trend: grouped bars (revenue vs labor cost) with the
// resulting contribution printed per month. Styled after MonthlyHoursChart.
export function ProfitTrendChart({ data }: { data: TrendPoint[] }) {
  const hasData = data.some((d) => d.revenue !== 0 || d.laborCost !== 0)
  if (!hasData) {
    return <p className="py-10 text-center text-sm text-slate-400">Δεν υπάρχουν δεδομένα για την περίοδο.</p>
  }
  const max = Math.max(...data.map((d) => Math.max(d.revenue, d.laborCost)), 1)

  return (
    <div>
      <div className="relative h-44">
        {[1, 0.75, 0.5, 0.25, 0].map((g) => (
          <div key={g} className="absolute inset-x-0 flex items-center gap-2" style={{ top: `${(1 - g) * 100}%` }}>
            <span className="w-12 shrink-0 text-right text-[10px] text-slate-400">
              {eur(max * g)}
            </span>
            <span className="h-px flex-1 bg-slate-100" />
          </div>
        ))}
        <div className="absolute inset-0 flex items-stretch gap-2 pl-14">
          {data.map((d, i) => (
            <div
              key={d.month}
              className="group flex h-full flex-1 items-end justify-center gap-1"
              title={`${d.label}: έσοδα ${eur(d.revenue)} · κόστος ${eur(d.laborCost)} · συνεισφορά ${eur(d.contribution)}`}
            >
              <motion.div
                className="w-full max-w-[18px] rounded-t bg-gradient-to-t from-blue-600 to-blue-400 transition-colors group-hover:from-blue-700 group-hover:to-blue-500"
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(d.revenue > 0 ? 2 : 0, (d.revenue / max) * 100)}%` }}
                transition={{ duration: 0.55, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.div
                className="w-full max-w-[18px] rounded-t bg-gradient-to-t from-slate-400 to-slate-300 transition-colors group-hover:from-slate-500 group-hover:to-slate-400"
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(d.laborCost > 0 ? 2 : 0, (d.laborCost / max) * 100)}%` }}
                transition={{ duration: 0.55, delay: 0.08 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* month labels + contribution row */}
      <div className="mt-1.5 flex gap-2 pl-14">
        {data.map((d) => (
          <div key={d.month} className="flex-1 text-center">
            <div className="truncate text-[10px] text-slate-500">{d.label}</div>
            <div
              className={`text-[11px] font-semibold tabular-nums ${
                d.contribution >= 0 ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {eur(d.contribution)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3.5 rounded-sm bg-blue-600" /> Έσοδα
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3.5 rounded-sm bg-slate-300" /> Κόστος εργασίας
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-semibold text-emerald-600">€</span> Συνεισφορά (κάτω από κάθε μήνα)
        </span>
      </div>
    </div>
  )
}
