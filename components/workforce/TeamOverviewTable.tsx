'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Search } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { eur, hrs, pct } from '@/lib/format'
import type { EmployeeRow } from '@/lib/profitability'
import { downloadCsv } from './csv'
import { InfoTip } from './InfoTip'

// Workload and cost per employee — no scores, no ranking, no judgement.
// Sorted by hours simply because that is the natural reading order.
export function TeamOverviewTable({ employees, lang }: { employees: EmployeeRow[]; lang: string }) {
  const router = useRouter()
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase()
    return employees
      .filter((e) => e.active || e.hours > 0)
      .filter((e) => (query ? e.name.toLowerCase().includes(query) : true))
      .sort((a, b) => b.hours - a.hours)
  }, [employees, q])

  const totals = rows.reduce(
    (acc, e) => ({ hours: acc.hours + e.hours, cost: acc.cost + e.laborCost }),
    { hours: 0, cost: 0 }
  )

  const exportCsv = () =>
    downloadCsv(
      'team-overview.csv',
      ['Employee', 'Hours', 'Labor cost', 'Billable %'],
      rows.map((e) => [e.name, e.hours, e.laborCost, e.billableShare !== null ? Math.round(e.billableShare * 1000) / 10 : null])
    )

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Team Overview</h2>
          <p className="text-xs text-slate-400">Ώρες και κόστος εργασίας ανά άτομο</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Αναζήτηση…"
              className="w-36 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-sm text-slate-900 outline-none transition focus:border-blue-400"
            />
          </div>
          <button
            onClick={exportCsv}
            title="Εξαγωγή CSV"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              <th className="px-5 py-3 font-medium">Εργαζόμενος</th>
              <th className="px-5 py-3 text-right font-medium">Ώρες</th>
              <th className="px-5 py-3 text-right font-medium">
                <span className="inline-flex items-center gap-1">
                  <InfoTip text="Ώρες εργασίας × το ωριαίο κόστος του εργαζόμενου (μισθός ÷ συμβατικές ώρες)." />
                  Κόστος εργασίας
                </span>
              </th>
              <th className="px-5 py-3 text-right font-medium">
                <span className="inline-flex items-center gap-1">
                  <InfoTip text="Ποσοστό των ωρών που δουλεύτηκαν για χρεώσιμους πελάτες." />
                  Χρεώσιμες %
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                  Καμία καταχώρηση στην περίοδο
                </td>
              </tr>
            )}
            {rows.map((e) => (
              <tr
                key={e.id}
                onClick={() => router.push(`/${lang}/dashboard/employees/${e.id}`)}
                className="cursor-pointer border-t border-slate-50 transition hover:bg-blue-50/40"
              >
                <td className="px-5 py-3">
                  <span className="font-medium text-blue-600">{e.name}</span>
                  {!e.active && (
                    <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">ανενεργός</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-700">{hrs(e.hours)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-700">{eur(e.laborCost)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-600">{pct(e.billableShare)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-100 bg-slate-50/60 text-slate-700">
                <td className="px-5 py-2.5 text-xs font-medium">Σύνολο</td>
                <td className="px-5 py-2.5 text-right text-sm font-semibold tabular-nums">{hrs(totals.hours)}</td>
                <td className="px-5 py-2.5 text-right text-sm font-semibold tabular-nums">{eur(totals.cost)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  )
}
