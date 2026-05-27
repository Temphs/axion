'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/axion/ui'
import { api } from '@/components/dashboard/api'
import { eur, hrs } from '@/lib/format'

type Client = {
  id: string
  name: string
  billable: boolean
  monthlyRevenue: number
  active: boolean
  notes: string | null
  hours: number
  cost: number
}

export function ClientsManager({ initial }: { initial: Client[] }) {
  const router = useRouter()
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [billable, setBillable] = useState(true)
  const [monthlyRevenue, setMonthlyRevenue] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reset() {
    setEditId(null); setName(''); setBillable(true); setMonthlyRevenue(''); setNotes(''); setError(null)
  }
  function startEdit(c: Client) {
    setEditId(c.id); setName(c.name); setBillable(c.billable); setMonthlyRevenue(String(c.monthlyRevenue)); setNotes(c.notes ?? ''); setError(null)
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true); setError(null)
    const body = { name, billable, monthlyRevenue: Number(monthlyRevenue) || 0, notes }
    const r = editId
      ? await api('PATCH', `/api/clients/${editId}`, body)
      : await api('POST', '/api/clients', body)
    setSaving(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    reset(); router.refresh()
  }
  async function toggle(c: Client) {
    await api('PATCH', `/api/clients/${c.id}`, { active: !c.active })
    router.refresh()
  }
  async function remove(c: Client) {
    const r = await api('DELETE', `/api/clients/${c.id}`)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Πελάτες</h1>
        <p className="text-sm text-slate-500">
          Μέσος όρος ανά μήνα — ώρες & κόστος μισθών (σταθμισμένο ανά κόστος/ώρα κάθε εργαζομένου)
        </p>
      </header>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">{editId ? 'Επεξεργασία πελάτη' : 'Νέος πελάτης'}</h2>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_180px_1fr_auto] sm:items-end">
          <Field label="Όνομα">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required placeholder="KOLYMBARI O.E." />
          </Field>
          <Field label="Μηνιαίο έσοδο (€)">
            <input className={inputCls} type="number" min="0" step="0.01" value={monthlyRevenue} onChange={(e) => setMonthlyRevenue(e.target.value)} placeholder="500" disabled={!billable} />
          </Field>
          <Field label="Σημειώσεις">
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="h-[42px] rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
              {editId ? 'Αποθήκευση' : 'Προσθήκη'}
            </button>
            {editId && (
              <button type="button" onClick={reset} className="h-[42px] rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">Άκυρο</button>
            )}
          </div>
        </form>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Χρεώσιμος πελάτης
        </label>
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Πελάτης</th>
                <th className="px-5 py-3 font-medium">Τύπος</th>
                <th className="px-5 py-3 text-right font-medium">Ώρες/μήνα</th>
                <th className="px-5 py-3 text-right font-medium">Κόστος μισθών/μήνα</th>
                <th className="px-5 py-3 text-right font-medium">Μηνιαίο έσοδο</th>
                <th className="px-5 py-3 text-center font-medium">Κατάσταση</th>
                <th className="px-5 py-3 text-right font-medium">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              {initial.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">Κανένας πελάτης ακόμη</td></tr>
              )}
              {initial.map((c) => (
                <tr key={c.id} className="border-t border-slate-50">
                  <td className="px-5 py-3 text-slate-800">
                    {c.name}
                    {c.notes && <span className="ml-2 text-xs text-slate-400">{c.notes}</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={'rounded-full px-2.5 py-0.5 text-xs font-medium ' + (c.billable ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600')}>
                      {c.billable ? 'Χρεώσιμος' : 'Overhead'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-700">{hrs(c.hours)}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-slate-700">{eur(c.cost)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-600">{c.billable ? eur(c.monthlyRevenue) : '—'}</td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => toggle(c)} className={'rounded-full px-2.5 py-0.5 text-xs font-medium ' + (c.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                      {c.active ? 'Ενεργός' : 'Ανενεργός'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(c)} className="text-blue-600 hover:underline">Επεξεργασία</button>
                      <button onClick={() => remove(c)} className="text-red-500 hover:underline">Διαγραφή</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}
