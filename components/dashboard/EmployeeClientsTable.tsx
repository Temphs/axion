'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { eur, hrs } from '@/lib/format'

type Row = { id: string; name: string; hours: number; cost: number; billable: boolean }

export function EmployeeClientsTable({ clients, lang }: { clients: Row[]; lang: string }) {
  const [q, setQ] = useState('')
  const filtered = q.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()))
    : clients

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Πελάτες ({clients.length})</h2>
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
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-medium">Πελάτης</th>
              <th className="px-5 py-3 text-right font-medium">Ώρες</th>
              <th className="px-5 py-3 text-right font-medium">Κόστος</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">Δεν βρέθηκαν αποτελέσματα</td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                <td className="px-5 py-3 text-slate-800">
                  <span className="flex items-center gap-2">
                    <Link href={`/${lang}/dashboard/clients/${c.id}`} className="font-medium text-blue-600 hover:underline">{c.name}</Link>
                    {!c.billable && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">overhead</span>}
                  </span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-600">{hrs(c.hours)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-600">{eur(c.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
