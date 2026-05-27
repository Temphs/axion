'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { api } from '@/components/dashboard/api'

export function ClientEditPanel({
  lang,
  id,
  name,
  billable,
  monthlyRevenue,
  notes,
  active,
}: {
  lang: string
  id: string
  name: string
  billable: boolean
  monthlyRevenue: number
  notes: string | null
  active: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [n, setN] = useState(name)
  const [bill, setBill] = useState(billable)
  const [rev, setRev] = useState(String(monthlyRevenue))
  const [note, setNote] = useState(notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const r = await api('PATCH', `/api/clients/${id}`, { name: n, billable: bill, monthlyRevenue: Number(rev) || 0, notes: note })
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    setOpen(false); router.refresh()
  }

  async function toggleActive() {
    setBusy(true)
    await api('PATCH', `/api/clients/${id}`, { active: !active })
    setBusy(false); router.refresh()
  }

  async function remove() {
    if (!confirm('Διαγραφή πελάτη;')) return
    setBusy(true); setError(null)
    const r = await api('DELETE', `/api/clients/${id}`)
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    router.push(`/${lang}/dashboard/clients`)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        <Pencil size={15} /> Επεξεργασία
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <form onSubmit={save} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Όνομα</span>
              <input className={inputCls} value={n} onChange={(e) => setN(e.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Μηνιαίο έσοδο (€)</span>
              <input className={inputCls} type="number" min="0" step="0.01" value={rev} onChange={(e) => setRev(e.target.value)} disabled={!bill} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Σημειώσεις</span>
              <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={bill} onChange={(e) => setBill(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Χρεώσιμος πελάτης
            </label>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                Αποθήκευση
              </button>
              <button type="button" onClick={toggleActive} disabled={busy} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                {active ? 'Απενεργοπ.' : 'Ενεργοπ.'}
              </button>
            </div>
            <button type="button" onClick={remove} disabled={busy} className="w-full rounded-xl px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50">
              Διαγραφή
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400'
