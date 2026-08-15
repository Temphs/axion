'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { eur, hrs } from '@/lib/format'
import type { EmployeeClientSlice } from '@/lib/profitability'
import { InfoTip } from '@/components/workforce/InfoTip'

// Employee → client breakdown: where the employee's time went and whether that
// time was profitable. Shows if a "weak" employee is really a weak client.
const PREVIEW_COUNT = 10

export function EmployeeClientsTable({ clients, lang }: { clients: EmployeeClientSlice[]; lang: string }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [showAll, setShowAll] = useState(false)
  const filtered = q.trim()
    ? clients.filter((c) => c.clientName.toLowerCase().includes(q.trim().toLowerCase()))
    : clients
  const visible = showAll || q.trim() ? filtered : filtered.slice(0, PREVIEW_COUNT)
  const hiddenCount = filtered.length - visible.length

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Πού πήγε ο χρόνος ({clients.length} πελάτες)</h2>
          <p className="text-xs text-slate-400">Έσοδα επιμερισμένα αναλογικά με τις ώρες του εργαζόμενου ανά μήνα</p>
        </div>
        <div className="relative w-full max-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Αναζήτηση πελάτη…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-medium">Πελάτης</th>
              <th className="px-5 py-3 text-right font-medium">Ώρες</th>
              <th className="px-5 py-3 text-right font-medium">Έσοδα</th>
              <th className="px-5 py-3 text-right font-medium">Κόστος</th>
              <th className="px-5 py-3 text-right font-medium">
                <span className="inline-flex items-center gap-1">
                  <InfoTip text="Επιμερισμένα έσοδα − κόστος εργασίας του εργαζόμενου στον πελάτη" />
                  Συνεισφορά
                </span>
              </th>
              <th className="px-5 py-3 text-right font-medium">€ / ώρα</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">Δεν βρέθηκαν αποτελέσματα</td>
              </tr>
            )}
            {visible.map((c) => (
              <tr
                key={c.clientId}
                onClick={() => router.push(`/${lang}/dashboard/clients/${c.clientId}`)}
                className="cursor-pointer border-t border-slate-50 hover:bg-blue-50/40"
              >
                <td className="px-5 py-3 text-slate-800">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-blue-600">{c.clientName}</span>
                    {!c.billable && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">overhead</span>
                    )}
                  </span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-600">{hrs(c.hours)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-600">{c.billable ? eur(c.revenue) : '—'}</td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-600">{eur(c.laborCost)}</td>
                <td className={`px-5 py-3 text-right font-medium tabular-nums ${c.contribution >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {c.billable ? eur(c.contribution) : '—'}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-600">
                  {c.revenuePerHour !== null ? eur(c.revenuePerHour, true) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(hiddenCount > 0 || (showAll && filtered.length > PREVIEW_COUNT)) && (
        <div className="border-t border-slate-100 px-5 py-3 text-center">
          <button
            onClick={() => setShowAll((v) => !v)}
            className="rounded-lg px-4 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
          >
            {showAll ? 'Λιγότερα' : `Περισσότερα (${hiddenCount} ακόμη)`}
          </button>
        </div>
      )}
    </Card>
  )
}
