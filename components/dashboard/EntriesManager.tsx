'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/axion/ui'
import { api } from '@/components/dashboard/api'
import { hrs, shortDate } from '@/lib/format'

type Ref = { id: string; name: string }
type Entry = {
  id: string
  date: string
  minutes: number
  workType: string | null
  notes: string | null
  employee: Ref
  client: Ref
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function EntriesManager({ entries, employees, clients }: { entries: Entry[]; employees: Ref[]; clients: Ref[] }) {
  const router = useRouter()
  const [date, setDate] = useState(today())
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '')
  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [hours, setHours] = useState('')
  const [workType, setWorkType] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const canAdd = employees.length > 0 && clients.length > 0

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true); setError(null)
    const r = await api('POST', '/api/entries', {
      date, employeeId, clientId, hours: Number(hours) || 0, workType, notes,
    })
    setSaving(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    setHours(''); setWorkType(''); setNotes('')
    router.refresh()
  }

  async function remove(e: Entry) {
    await api('DELETE', `/api/entries/${e.id}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Καταχωρήσεις εργασίας</h1>
        <p className="text-sm text-slate-500">Χειροκίνητη προσθήκη ή μέσω της εφαρμογής καταγραφής (API key)</p>
      </header>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Νέα καταχώρηση</h2>
        {!canAdd ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Προσθέστε πρώτα τουλάχιστον έναν εργαζόμενο και έναν πελάτη.
          </p>
        ) : (
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 lg:items-end">
            <Field label="Ημερομηνία">
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="Εργαζόμενος">
              <select className={inputCls} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Πελάτης">
              <select className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Ώρες">
              <input type="number" min="0" step="0.25" className={inputCls} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="1.5" required />
            </Field>
            <Field label="Είδος">
              <input className={inputCls} value={workType} onChange={(e) => setWorkType(e.target.value)} placeholder="Καταχώρηση" />
            </Field>
            <button type="submit" disabled={saving} className="h-[42px] rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
              Προσθήκη
            </button>
          </form>
        )}
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Πρόσφατες καταχωρήσεις</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Ημ/νία</th>
                <th className="px-5 py-3 font-medium">Εργαζόμενος</th>
                <th className="px-5 py-3 font-medium">Πελάτης</th>
                <th className="px-5 py-3 font-medium">Είδος</th>
                <th className="px-5 py-3 text-right font-medium">Ώρες</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Καμία καταχώρηση ακόμη</td></tr>
              )}
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-slate-50">
                  <td className="px-5 py-3 tabular-nums text-slate-600">{shortDate(e.date)}</td>
                  <td className="px-5 py-3 text-slate-800">{e.employee.name}</td>
                  <td className="px-5 py-3 text-slate-600">{e.client.name}</td>
                  <td className="px-5 py-3 text-slate-500">{e.workType ?? '—'}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-600">{hrs(e.minutes / 60)}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => remove(e)} className="text-red-500 hover:underline">Διαγραφή</button>
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
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}
