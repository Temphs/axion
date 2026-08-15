'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { eur, hrs, pct } from '@/lib/format'
import type { ClientHealth, ClientRow } from '@/lib/profitability'
import { downloadCsv } from './csv'
import { InfoTip } from './InfoTip'

type SortKey = 'name' | 'revenue' | 'hours' | 'laborCost' | 'contribution' | 'margin' | 'revenuePerHour'

const HEALTH_LABELS: Record<ClientHealth, { label: string; cls: string }> = {
  healthy: { label: 'Υγιής', cls: 'bg-emerald-50 text-emerald-700' },
  watch: { label: 'Παρακολούθηση', cls: 'bg-amber-50 text-amber-700' },
  critical: { label: 'Κρίσιμος', cls: 'bg-red-50 text-red-600' },
  overhead: { label: 'Overhead', cls: 'bg-slate-100 text-slate-500' },
}

const COLUMNS: Array<{ key: SortKey; label: string; align?: 'right'; tip?: string }> = [
  { key: 'name', label: 'Πελάτης' },
  { key: 'revenue', label: 'Έσοδα', align: 'right', tip: 'Μηνιαίο έσοδο πελάτη, αναλογικά για την περίοδο (μόνο μήνες με δραστηριότητα)' },
  { key: 'hours', label: 'Ώρες', align: 'right' },
  { key: 'laborCost', label: 'Κόστος', align: 'right' },
  { key: 'contribution', label: 'Συνεισφορά', align: 'right', tip: 'Έσοδα − κόστος εργασίας' },
  { key: 'margin', label: 'Περιθώριο', align: 'right' },
  { key: 'revenuePerHour', label: '€ / ώρα', align: 'right', tip: 'Έσοδα ÷ ώρες εργαζομένων στον πελάτη' },
]

export function ClientProfitabilityTable({ clients, lang }: { clients: ClientRow[]; lang: string }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [health, setHealth] = useState<'' | ClientHealth>('')
  const [sortKey, setSortKey] = useState<SortKey>('contribution')
  const [desc, setDesc] = useState(true)

  const rows = useMemo(() => {
    let list = clients
    if (health) list = list.filter((c) => c.health === health)
    const query = q.trim().toLowerCase()
    if (query) list = list.filter((c) => c.name.toLowerCase().includes(query))
    return [...list].sort((a, b) => {
      if (sortKey === 'name') {
        const cmp = a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        return desc ? -cmp : cmp
      }
      const va = a[sortKey] ?? -Infinity
      const vb = b[sortKey] ?? -Infinity
      return desc ? Number(vb) - Number(va) : Number(va) - Number(vb)
    })
  }, [clients, q, health, sortKey, desc])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setDesc((d) => !d)
    else {
      setSortKey(key)
      setDesc(key !== 'name')
    }
  }

  const exportCsv = () =>
    downloadCsv(
      'client-profitability.csv',
      ['Client', 'Revenue', 'Hours', 'Labor cost', 'Contribution', 'Margin %', 'Revenue/hour', 'Status'],
      rows.map((c) => [
        c.name,
        c.revenue,
        c.hours,
        c.laborCost,
        c.contribution,
        c.margin !== null ? Math.round(c.margin * 1000) / 10 : null,
        c.revenuePerHour,
        HEALTH_LABELS[c.health].label,
      ])
    )

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Κερδοφορία πελατών</h2>
          <p className="text-xs text-slate-400">Ποιοι πελάτες αξίζουν τον χρόνο της ομάδας — και ποιοι όχι</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={health}
            onChange={(e) => setHealth(e.target.value as '' | ClientHealth)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600"
          >
            <option value="">Όλες οι καταστάσεις</option>
            <option value="healthy">Υγιείς</option>
            <option value="watch">Παρακολούθηση</option>
            <option value="critical">Κρίσιμοι</option>
            <option value="overhead">Overhead</option>
          </select>
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
              <th className="px-4 py-3 font-medium">Κατάσταση</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-5 py-8 text-center text-slate-400">
                  Δεν βρέθηκαν πελάτες με δραστηριότητα στην περίοδο
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr
                key={c.id}
                onClick={() => router.push(`/${lang}/dashboard/clients/${c.id}`)}
                className="cursor-pointer border-t border-slate-50 transition hover:bg-blue-50/40"
              >
                <td className="px-4 py-3 font-medium text-blue-600">{c.name}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{c.billable ? eur(c.revenue) : '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{hrs(c.hours)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{eur(c.laborCost)}</td>
                <td className={`px-4 py-3 text-right font-medium tabular-nums ${c.contribution >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {c.billable ? eur(c.contribution) : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{pct(c.margin)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                  {c.revenuePerHour !== null ? eur(c.revenuePerHour, true) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${HEALTH_LABELS[c.health].cls}`}>
                    {HEALTH_LABELS[c.health].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
