'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, Plus } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { api } from '@/components/dashboard/api'
import { hrs, num, shortDate } from '@/lib/format'
import type { DayLog } from '@/lib/stats'

// Days that came in under the account's daily target, with a one-click top-up.
//
// The gap is almost always unbilled work that never got written down — a call
// with another client, internal admin — so filling it means adding the missing
// hours against an overhead (non-billable) client. That keeps the day's total
// honest without inventing billable time.

type OverheadClient = { id: string; name: string }

export function DayCompletionCard({
  employeeId,
  employeeName,
  days,
  targetHours,
  overheadClients,
}: {
  employeeId: string
  employeeName: string
  days: DayLog[]
  targetHours: number
  overheadClients: OverheadClient[]
}) {
  const router = useRouter()
  const incomplete = useMemo(() => days.filter((d) => d.missingHours > 0.01), [days])

  const [clientId, setClientId] = useState(overheadClients[0]?.id ?? '')
  const [workType, setWorkType] = useState('Συμπληρωματικός χρόνος')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const totalMissing = incomplete.reduce((s, d) => s + d.missingHours, 0)
  const canFill = overheadClients.length > 0

  async function fill(target: DayLog[], key: string) {
    if (!canFill) return
    setBusy(key)
    setError(null)
    const r = await api('POST', '/api/entries', {
      entries: target.map((d) => ({
        date: d.date,
        employeeId,
        clientId,
        hours: Math.round(d.missingHours * 100) / 100,
        workType: workType.trim() || null,
      })),
    })
    setBusy(null)
    if (!r.ok) return setError(r.data.error ?? 'Η συμπλήρωση απέτυχε')
    router.refresh()
  }

  if (incomplete.length === 0) {
    return (
      <Card className="flex items-center gap-3 p-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Check size={18} strokeWidth={2.25} />
        </span>
        <div>
          <h2 className="font-display text-base font-bold tracking-tight text-slate-900">
            Πλήρεις καταχωρήσεις
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Κάθε ημέρα με καταχώρηση φτάνει τις {num(targetHours)} ώρες.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle size={18} strokeWidth={2.25} />
          </span>
          <div>
            <h2 className="font-display text-base font-bold tracking-tight text-slate-900">
              {num(incomplete.length)} ημέρες κάτω από τις {num(targetHours)} ώρες
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Λείπουν συνολικά {hrs(totalMissing)} από τις καταχωρήσεις του/της {employeeName}.
            </p>
          </div>
        </div>
        {canFill && (
          <button
            onClick={() => fill(incomplete, 'all')}
            disabled={busy !== null}
            className="rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {busy === 'all' ? 'Συμπλήρωση…' : 'Συμπλήρωση όλων'}
          </button>
        )}
      </div>

      {canFill ? (
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">Πελάτης overhead</span>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400"
            >
              {overheadClients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">Είδος εργασίας</span>
            <input
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className="w-56 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400"
            />
          </label>
          <p className="text-[11px] leading-snug text-slate-400">
            Οι ώρες που λείπουν καταχωρούνται ως μη χρεώσιμες σε αυτόν τον πελάτη.
          </p>
        </div>
      ) : (
        <p className="border-b border-slate-100 bg-amber-50 px-5 py-3 text-xs text-amber-700">
          Δεν υπάρχει πελάτης overhead. Δημιουργήστε έναν μη χρεώσιμο πελάτη για να συμπληρώνετε τα κενά.
        </p>
      )}

      {error && <p className="bg-red-50 px-5 py-2 text-sm text-red-600">{error}</p>}

      <ul className="divide-y divide-slate-50">
        {incomplete.slice(0, 30).map((d) => (
          <li key={d.date} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-sm">
            <span className="w-24 shrink-0 tabular-nums text-slate-700">{shortDate(d.date)}</span>
            <span className="tabular-nums text-slate-500">{hrs(d.hours)} καταχωρημένες</span>
            <span className="font-medium tabular-nums text-amber-700">λείπουν {hrs(d.missingHours)}</span>
            {canFill && (
              <button
                onClick={() => fill([d], d.date)}
                disabled={busy !== null}
                className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              >
                <Plus size={12} />
                {busy === d.date ? 'Συμπλήρωση…' : 'Συμπλήρωση'}
              </button>
            )}
          </li>
        ))}
      </ul>

      {incomplete.length > 30 && (
        <p className="px-5 py-2.5 text-xs text-slate-400">
          Εμφανίζονται οι 30 πιο πρόσφατες από {num(incomplete.length)} ημέρες.
        </p>
      )}
    </Card>
  )
}
