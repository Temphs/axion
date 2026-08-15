import Link from 'next/link'
import { Card } from '@/components/axion/ui'
import { hrs, pct } from '@/lib/format'
import type { CapacityRow, CapacityStatus } from '@/lib/profitability'

const STATUS: Record<CapacityStatus, { label: string; bar: string; text: string }> = {
  under: { label: 'Υποαπασχόληση', bar: 'bg-slate-300', text: 'text-slate-500' },
  healthy: { label: 'Υγιής', bar: 'bg-emerald-500', text: 'text-emerald-600' },
  near: { label: 'Κοντά στο όριο', bar: 'bg-amber-500', text: 'text-amber-600' },
  over: { label: 'Υπερφόρτωση', bar: 'bg-red-500', text: 'text-red-600' },
}

// "Who can take the next client?" — allocation of available hours per employee.
export function CapacityPanel({ capacity, lang }: { capacity: CapacityRow[]; lang: string }) {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-slate-900">Χωρητικότητα ομάδας</h2>
      <p className="mb-4 text-xs text-slate-400">Κατανεμημένες vs διαθέσιμες ώρες περιόδου</p>
      {capacity.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">Δεν υπάρχουν ενεργοί εργαζόμενοι.</p>
      ) : (
        <div className="space-y-3.5">
          {capacity.map((c) => {
            const s = c.status ? STATUS[c.status] : null
            const width = c.allocation !== null ? Math.min(100, c.allocation * 100) : 0
            return (
              <div key={c.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <Link
                    href={`/${lang}/dashboard/employees/${c.id}`}
                    className="truncate font-medium text-slate-700 transition hover:text-blue-600"
                  >
                    {c.name}
                  </Link>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    {c.allocation !== null ? pct(c.allocation) : '—'}
                    {s && <span className={`ml-1.5 font-medium ${s.text}`}>{s.label}</span>}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${s?.bar ?? 'bg-slate-300'}`} style={{ width: `${width}%` }} />
                </div>
                <div className="mt-0.5 text-[10px] tabular-nums text-slate-400">
                  {hrs(c.allocatedHours)} από {hrs(c.availableHours)} · ελεύθερες {hrs(c.remainingHours)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
