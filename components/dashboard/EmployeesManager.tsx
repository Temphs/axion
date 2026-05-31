'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/axion/ui'
import { api } from '@/components/dashboard/api'
import { eur } from '@/lib/format'

type Employee = {
  id: string
  name: string
  monthlyCost: number
  costPerHour: number
  active: boolean
  notes: string | null
}

export function EmployeesManager({ initial, hoursPerMonth }: { initial: Employee[]; hoursPerMonth: number }) {
  const router = useRouter()
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [monthlyCost, setMonthlyCost] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const previewRate = Number(monthlyCost) > 0 && hoursPerMonth > 0 ? Number(monthlyCost) / hoursPerMonth : 0

  function reset() {
    setEditId(null); setName(''); setMonthlyCost(''); setNotes(''); setError(null)
  }

  function startEdit(e: Employee) {
    setEditId(e.id); setName(e.name); setMonthlyCost(String(e.monthlyCost)); setNotes(e.notes ?? ''); setError(null)
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true); setError(null)
    const body = { name, monthlyCost: Number(monthlyCost) || 0, notes }
    const r = editId
      ? await api('PATCH', `/api/employees/${editId}`, body)
      : await api('POST', '/api/employees', body)
    setSaving(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    reset(); router.refresh()
  }

  async function toggle(e: Employee) {
    await api('PATCH', `/api/employees/${e.id}`, { active: !e.active })
    router.refresh()
  }

  async function remove(e: Employee) {
    const r = await api('DELETE', `/api/employees/${e.id}`)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Εργαζόμενοι</h1>
        <p className="mt-0.5 text-sm text-blue-200/80">Μηνιαίο κόστος → κόστος/ώρα (διά {hoursPerMonth} ώρες/μήνα)</p>
      </header>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          {editId ? 'Επεξεργασία εργαζομένου' : 'Νέος εργαζόμενος'}
        </h2>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_180px_1fr_auto] sm:items-end">
          <Field label="Όνομα">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required placeholder="Δημήτρης" />
          </Field>
          <Field label="Μηνιαίο κόστος (€)">
            <input className={inputCls} type="number" min="0" step="0.01" value={monthlyCost} onChange={(e) => setMonthlyCost(e.target.value)} placeholder="1600" />
          </Field>
          <Field label="Σημειώσεις">
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Λογιστής" />
          </Field>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="h-[42px] rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
              {editId ? 'Αποθήκευση' : 'Προσθήκη'}
            </button>
            {editId && (
              <button type="button" onClick={reset} className="h-[42px] rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Άκυρο
              </button>
            )}
          </div>
        </form>
        {previewRate > 0 && (
          <p className="mt-2 text-xs text-slate-500">≈ {eur(previewRate, true)} / ώρα</p>
        )}
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Όνομα</th>
                <th className="px-5 py-3 text-right font-medium">Μηνιαίο κόστος</th>
                <th className="px-5 py-3 text-right font-medium">Κόστος/ώρα</th>
                <th className="px-5 py-3 text-center font-medium">Κατάσταση</th>
                <th className="px-5 py-3 text-right font-medium">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              {initial.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Κανένας εργαζόμενος ακόμη</td></tr>
              )}
              {initial.map((e) => (
                <tr key={e.id} className="border-t border-slate-50">
                  <td className="px-5 py-3 text-slate-800">
                    {e.name}
                    {e.notes && <span className="ml-2 text-xs text-slate-400">{e.notes}</span>}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-600">{eur(e.monthlyCost)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-600">{eur(e.costPerHour, true)}</td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => toggle(e)} className={'rounded-full px-2.5 py-0.5 text-xs font-medium ' + (e.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                      {e.active ? 'Ενεργός' : 'Ανενεργός'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(e)} className="text-blue-600 hover:underline">Επεξεργασία</button>
                      <button onClick={() => remove(e)} className="text-red-500 hover:underline">Διαγραφή</button>
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
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}
