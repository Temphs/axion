'use client'

import { useState } from 'react'
import { Check, Clock, History } from 'lucide-react'

type LogClient = { id: string; name: string }
type RecentEntry = { id: string; date: string; clientName: string; hours: number; workType: string | null }

const QUICK_HOURS = [0.5, 1, 2, 4, 8]

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('el-GR', { day: 'numeric', month: 'short' }).format(new Date(iso))
}

export function WorkLogForm({
  token,
  employeeName,
  clients,
  initialRecent,
}: {
  token: string
  employeeName: string
  clients: LogClient[]
  initialRecent: RecentEntry[]
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [date, setDate] = useState(todayISO())
  const [hours, setHours] = useState('')
  const [workType, setWorkType] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justLogged, setJustLogged] = useState<{ hours: number; clientName: string } | null>(null)
  const [recent, setRecent] = useState(initialRecent)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setJustLogged(null)
    const h = Number(hours)
    if (!clientId) return setError('Επίλεξε πελάτη.')
    if (!hours || !Number.isFinite(h) || h <= 0) return setError('Γράψε τις ώρες.')

    setBusy(true)
    const res = await fetch(`/api/log/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, date, hours: h, workType, notes }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)

    if (!res.ok) return setError(data.error ?? 'Κάτι πήγε στραβά, δοκίμασε ξανά.')

    const clientName = clients.find((c) => c.id === clientId)?.name ?? ''
    setJustLogged({ hours: h, clientName })
    setRecent((prev) => [{ id: data.entry.id, date, clientName, hours: h, workType: workType.trim() || null }, ...prev].slice(0, 5))
    setHours('')
    setNotes('')
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-3xl border border-white/40 bg-white/95 p-8 text-center shadow-xl backdrop-blur-md">
        <h1 className="font-display text-lg font-semibold text-slate-900">Γεια σου, {employeeName}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Δεν υπάρχει ακόμη κανένας ενεργός πελάτης στον λογαριασμό. Ζήτησε από τον λογιστή σου να προσθέσει έναν πριν καταγράψεις ώρες.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/40 bg-white/95 p-6 shadow-xl backdrop-blur-md">
        <h1 className="font-display text-xl font-semibold tracking-tight text-slate-900">Γεια σου, {employeeName}</h1>
        <p className="mt-1 text-sm text-slate-500">Καταχώρησε τις ώρες σου — καταγράφεται αμέσως.</p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Πελάτης</span>
            <select className={fieldCls} value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Ημερομηνία</span>
            <input type="date" className={fieldCls} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Ώρες</span>
            <input
              type="number"
              inputMode="decimal"
              min="0.25"
              step="0.25"
              placeholder="π.χ. 3.5"
              className={`${fieldCls} text-lg font-semibold tabular-nums`}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_HOURS.map((h) => (
                <button
                  type="button"
                  key={h}
                  onClick={() => setHours(String(h))}
                  className={
                    'rounded-full border px-3 py-1 text-xs font-medium transition ' +
                    (hours === String(h)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50')
                  }
                >
                  {h}ω
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Είδος (προαιρετικό)</span>
            <input className={fieldCls} value={workType} onChange={(e) => setWorkType(e.target.value)} placeholder="π.χ. Μισθοδοσία, ΦΠΑ" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Σημειώσεις (προαιρετικό)</span>
            <textarea className={`${fieldCls} resize-none`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {justLogged && (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              <Check size={16} /> Καταχωρήθηκε: {justLogged.hours}ω για {justLogged.clientName}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? 'Καταχώρηση…' : 'Καταχώρηση ωρών'}
          </button>
        </form>
      </div>

      {recent.length > 0 && (
        <div className="rounded-3xl border border-white/40 bg-white/95 p-5 shadow-xl backdrop-blur-md">
          <div className="mb-3 flex items-center gap-1.5 text-slate-400">
            <History size={14} />
            <span className="text-xs font-semibold uppercase tracking-wide">Πρόσφατες καταχωρήσεις</span>
          </div>
          <ul className="space-y-2">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{r.clientName}</p>
                  <p className="truncate text-xs text-slate-400">{formatDay(r.date)}{r.workType ? ` · ${r.workType}` : ''}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  <Clock size={12} className="text-blue-500" /> {r.hours}ω
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

const fieldCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'
