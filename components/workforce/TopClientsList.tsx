import Link from 'next/link'
import { Card } from '@/components/axion/ui'
import { eur, hrs } from '@/lib/format'
import { percentChange, type ClientRow } from '@/lib/profitability'

type Metric = 'hours' | 'laborCost'

// Compact "who eats the most time / money" list. Five rows, one number each,
// with a small bar so the relative weight is obvious at a glance.
export function TopClientsList({
  clients,
  previousHours,
  metric,
  lang,
  limit = 5,
}: {
  clients: ClientRow[]
  previousHours?: Map<string, number>
  metric: Metric
  lang: string
  limit?: number
}) {
  const rows = [...clients].sort((a, b) => b[metric] - a[metric]).slice(0, limit)
  const max = rows.length > 0 ? rows[0][metric] : 0
  const title = metric === 'hours' ? 'Top Clients by Hours' : 'Top Clients by Labor Cost'
  const sub = metric === 'hours' ? 'Ποιοι πελάτες τρώνε τον περισσότερο χρόνο' : 'Κόστος εργασίας = ώρες × κόστος/ώρα'
  const format = (c: ClientRow) => (metric === 'hours' ? hrs(c.hours) : eur(c.laborCost))

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="mb-4 text-xs text-slate-400">{sub}</p>

      {rows.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">
          Καμία δραστηριότητα στην περίοδο
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((c) => {
            const change = metric === 'hours' && previousHours ? percentChange(c.hours, previousHours.get(c.id)) : null
            return (
              <li key={c.id}>
                <Link href={`/${lang}/dashboard/clients/${c.id}`} className="group block">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm text-slate-700 transition group-hover:text-blue-600">{c.name}</span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      {change !== null && Math.abs(change) >= 0.05 && (
                        <span className="text-[11px] tabular-nums text-slate-400">
                          {change > 0 ? '↑' : '↓'} {Math.abs(Math.round(change * 100))}%
                        </span>
                      )}
                      <span className="text-sm font-semibold tabular-nums text-slate-900">{format(c)}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500/70"
                      style={{ width: `${max > 0 ? (c[metric] / max) * 100 : 0}%` }}
                    />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
