'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { eur, hrs, pct } from '@/lib/format'
import type { EmployeeRow } from '@/lib/profitability'
import { downloadCsv } from './csv'
import { InfoTip } from './InfoTip'

type SortKey =
  | 'name'
  | 'hours'
  | 'billableHours'
  | 'utilization'
  | 'revenue'
  | 'laborCost'
  | 'contribution'
  | 'margin'
  | 'unbilledHours'

const COLUMNS: Array<{ key: SortKey; label: string; align?: 'right'; tip?: string }> = [
  { key: 'name', label: 'Εργαζόμενος' },
  { key: 'hours', label: 'Ώρες', align: 'right' },
  { key: 'billableHours', label: 'Χρεώσιμες', align: 'right' },
  {
    key: 'utilization',
    label: 'Αξιοποίηση',
    align: 'right',
    tip: 'Χρεώσιμες ώρες ÷ διαθέσιμες εργάσιμες ώρες περιόδου',
  },
  { key: 'revenue', label: 'Έσοδα', align: 'right' },
  { key: 'laborCost', label: 'Κόστος', align: 'right' },
  { key: 'contribution', label: 'Συνεισφορά', align: 'right', tip: 'Επιμερισμένα έσοδα − κόστος εργασίας' },
  { key: 'margin', label: 'Περιθώριο', align: 'right' },
  { key: 'unbilledHours', label: 'Μη τιμολ.', align: 'right', tip: 'Ώρες σε overhead ή σε πελάτες χωρίς ορισμένο έσοδο' },
]

function sortValue(e: EmployeeRow, key: SortKey): number | string {
  if (key === 'name') return e.name.toLowerCase()
  const v = e[key]
  return v === null ? -Infinity : v
}

export function EmployeePerformanceTable({ employees, lang }: { employees: EmployeeRow[]; lang: string }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('contribution')
  const [desc, setDesc] = useState(true)
  const [activeOnly, setActiveOnly] = useState(true)

  const rows = useMemo(() => {
    let list = employees.filter((e) => e.hours > 0 || e.active)
    if (activeOnly) list = list.filter((e) => e.active)
    const query = q.trim().toLowerCase()
    if (query) list = list.filter((e) => e.name.toLowerCase().includes(query))
    return [...list].sort((a, b) => {
      const va = sortValue(a, sortKey)
      const vb = sortValue(b, sortKey)
      const cmp = typeof va === 'string' && typeof vb === 'string' ? va.localeCompare(vb) : Number(va) - Number(vb)
      return desc ? -cmp : cmp
    })
  }, [employees, q, sortKey, desc, activeOnly])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setDesc((d) => !d)
    else {
      setSortKey(key)
      setDesc(key !== 'name')
    }
  }

  const exportCsv = () =>
    downloadCsv(
      'employee-performance.csv',
      ['Employee', 'Hours', 'Billable hours', 'Utilization %', 'Revenue', 'Labor cost', 'Contribution', 'Margin %', 'Unbilled hours'],
      rows.map((e) => [
        e.name,
        e.hours,
        e.billableHours,
        e.utilization !== null ? Math.round(e.utilization * 1000) / 10 : null,
        e.revenue,
        e.laborCost,
        e.contribution,
        e.margin !== null ? Math.round(e.margin * 1000) / 10 : null,
        e.unbilledHours,
      ])
    )

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Απόδοση εργαζομένων</h2>
          <p className="text-xs text-slate-400">Κερδοφορία ανά εργαζόμενο για την επιλεγμένη περίοδο</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
            Μόνο ενεργοί
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Αναζήτηση…"
              className="w-40 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-sm text-slate-900 outline-none transition focus:border-blue-400"
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
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              {COLUMNS.map((col) => (
                <th key={col.key} className={`px-4 py-3 font-medium ${col.align === 'right' ? 'text-right' : ''}`}>
                  <button
                    onClick={() => toggleSort(col.key)}
                    className={`inline-flex items-center gap-1 transition hover:text-slate-600 ${
                      col.align === 'right' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {col.tip && <InfoTip text={col.tip} />}
                    {col.label}
                    {sortKey === col.key ? (
                      desc ? <ArrowDown size={11} /> : <ArrowUp size={11} />
                    ) : (
                      <ArrowUpDown size={11} className="text-slate-200" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-5 py-8 text-center text-slate-400">
                  Δεν βρέθηκαν εργαζόμενοι
                </td>
              </tr>
            )}
            {rows.map((e) => (
              <tr
                key={e.id}
                onClick={() => router.push(`/${lang}/dashboard/employees/${e.id}`)}
                className="cursor-pointer border-t border-slate-50 transition hover:bg-blue-50/40"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-blue-600">{e.name}</span>
                  {!e.active && (
                    <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">ανενεργός</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{hrs(e.hours)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{hrs(e.billableHours)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <UtilizationBadge value={e.utilization} targetPct={e.targets.utilizationPct} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{eur(e.revenue)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{eur(e.laborCost)}</td>
                <td className={`px-4 py-3 text-right font-medium tabular-nums ${e.contribution >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {eur(e.contribution)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{pct(e.margin)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-500">{hrs(e.unbilledHours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function UtilizationBadge({ value, targetPct }: { value: number | null; targetPct: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>
  const target = (targetPct ?? 75) / 100
  const cls =
    value >= target ? 'text-emerald-600' : value >= target * 0.8 ? 'text-slate-600' : 'text-amber-600'
  return <span className={`font-medium ${cls}`}>{pct(value)}</span>
}
