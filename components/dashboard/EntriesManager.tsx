'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { api } from '@/components/dashboard/api'
import { DateField } from '@/components/dashboard/DateField'
import { hrs, shortDate } from '@/lib/format'

type Ref = { id: string; name: string; active?: boolean }
type Entry = {
  id: string
  date: string
  minutes: number
  workType: string | null
  notes: string | null
  employee: { id: string; name: string }
  client: { id: string; name: string }
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// yyyy-mm-dd from an ISO timestamp, for the inline date editor.
function isoDay(value: string): string {
  return value.slice(0, 10)
}

// A Greek keyboard types "1,5" for one and a half hours. Number() reads that as
// NaN, which the add form used to send as 0 and the API rejected with an error
// that didn't explain itself. Returns null for anything that isn't a number.
function parseHours(value: string): number | null {
  const n = Number(value.trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function EntriesManager({
  entries,
  employees,
  clients,
  from,
  to,
  employeeId,
  truncated,
}: {
  entries: Entry[]
  employees: Ref[]
  clients: Ref[]
  from: string
  to: string
  employeeId: string
  truncated: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const activeEmployees = employees.filter((e) => e.active !== false)
  const activeClients = clients.filter((c) => c.active !== false)

  const [date, setDate] = useState(today())
  const [newEmployeeId, setNewEmployeeId] = useState(activeEmployees[0]?.id ?? '')
  const [clientId, setClientId] = useState(activeClients[0]?.id ?? '')
  const [hours, setHours] = useState('')
  const [workType, setWorkType] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const canAdd = activeEmployees.length > 0 && activeClients.length > 0

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!date) return setError('Η ημερομηνία είναι υποχρεωτική')
    const parsedHours = parseHours(hours)
    if (parsedHours === null || parsedHours <= 0) return setError('Οι ώρες πρέπει να είναι θετικός αριθμός')
    if (date > today()) return setError('Η ημερομηνία δεν μπορεί να είναι μελλοντική')
    setSaving(true); setError(null)
    const r = await api('POST', '/api/entries', {
      date, employeeId: newEmployeeId, clientId, hours: parsedHours, workType, notes,
    })
    setSaving(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    setHours(''); setWorkType(''); setNotes('')
    router.refresh()
  }

  // All list filters live in the URL so the view is shareable and survives refresh.
  function setFilters(updates: Record<string, string>) {
    const q = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) q.set(key, value)
      else q.delete(key)
    }
    const qs = q.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const filtering = Boolean(from || to || employeeId)
  const totalHours = entries.reduce((s, e) => s + e.minutes, 0) / 60
  const filteredEmployeeName = employeeId ? employees.find((e) => e.id === employeeId)?.name : null

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Καταχωρήσεις εργασίας</h1>
        <p className="mt-0.5 text-sm text-blue-200/80">
          Ιστορικό ωρών — προσθέστε, διορθώστε ή διαγράψτε καταχωρήσεις
        </p>
      </header>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Νέα καταχώρηση</h2>
        {!canAdd ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Προσθέστε πρώτα τουλάχιστον έναν ενεργό εργαζόμενο και έναν ενεργό πελάτη.
          </p>
        ) : (
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 lg:items-end">
            <Field label="Ημερομηνία">
              <DateField value={date} onCommit={setDate} className="w-full" inputClassName={inputCls} ariaLabel="Ημερομηνία" />
            </Field>
            <Field label="Εργαζόμενος">
              <select className={inputCls} value={newEmployeeId} onChange={(e) => setNewEmployeeId(e.target.value)}>
                {activeEmployees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Πελάτης">
              <select className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {activeClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Ώρες">
              {/* text, not number: a number input in a non-Greek browser locale
                  drops a typed comma and hands back an empty string, so "1,5"
                  silently became nothing. parseHours accepts either separator. */}
              <input type="text" inputMode="decimal" className={inputCls} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="1,5" required />
            </Field>
            <Field label="Είδος">
              <input className={inputCls} value={workType} onChange={(e) => setWorkType(e.target.value)} placeholder="Καταχώρηση" />
            </Field>
            <Field label="Σημείωση (προαιρετικό)" className="md:col-span-2 lg:col-span-5">
              <input
                className={inputCls}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                placeholder="Ό,τι αξίζει να θυμάστε για αυτή την καταχώρηση"
              />
            </Field>
            <button type="submit" disabled={saving} className="h-[42px] rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
              Προσθήκη
            </button>
          </form>
        )}
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              {filtering ? 'Ιστορικό καταχωρήσεων' : 'Πρόσφατες καταχωρήσεις'}
            </h2>
            <p className="text-xs text-slate-500">
              {entries.length}
              {truncated ? '+' : ''} {entries.length === 1 ? 'καταχώρηση' : 'καταχωρήσεις'} · {hrs(totalHours)}
              {filteredEmployeeName && ` · ${filteredEmployeeName}`}
              {filtering && from && to && ` · ${rangeLabel(from, to)}`}
              {truncated && ' · περιορίστε το διάστημα για όλα'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={employeeId}
              onChange={(e) => setFilters({ employeeId: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="">Όλοι οι εργαζόμενοι</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}{e.active === false ? ' (ανενεργός)' : ''}
                </option>
              ))}
            </select>
            <span className="ml-1 text-xs font-medium text-slate-500">Διάστημα</span>
            <DateField value={from} onCommit={(v) => setFilters({ from: v })} ariaLabel="Από" inputClassName={searchInputCls} />
            <span className="text-slate-400">→</span>
            <DateField value={to} onCommit={(v) => setFilters({ to: v })} ariaLabel="Έως" inputClassName={searchInputCls} />
            {filtering && (
              <button
                onClick={() => setFilters({ from: '', to: '', employeeId: '' })}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              >
                Καθαρισμός
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="px-5 py-3 font-medium">Ημ/νία</th>
                <th className="px-5 py-3 font-medium">Εργαζόμενος</th>
                <th className="px-5 py-3 font-medium">Πελάτης</th>
                <th className="px-5 py-3 font-medium">Είδος</th>
                <th className="px-5 py-3 font-medium">Σημείωση</th>
                <th className="px-5 py-3 text-right font-medium">Ώρες</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                  {filtering ? 'Καμία καταχώρηση με αυτά τα φίλτρα' : 'Καμία καταχώρηση ακόμη'}
                </td></tr>
              )}
              {entries.map((e) => (
                <EntryRow key={e.id} entry={e} employees={employees} clients={clients} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/* ─── one row, viewable or editable in place ─────────────────── */

function EntryRow({ entry, employees, clients }: { entry: Entry; employees: Ref[]; clients: Ref[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [date, setDate] = useState(isoDay(entry.date))
  const [employeeId, setEmployeeId] = useState(entry.employee.id)
  const [clientId, setClientId] = useState(entry.client.id)
  const [hours, setHours] = useState(String(entry.minutes / 60))
  const [workType, setWorkType] = useState(entry.workType ?? '')
  const [notes, setNotes] = useState(entry.notes ?? '')

  function startEdit() {
    setDate(isoDay(entry.date))
    setEmployeeId(entry.employee.id)
    setClientId(entry.client.id)
    setHours(String(entry.minutes / 60))
    setWorkType(entry.workType ?? '')
    setNotes(entry.notes ?? '')
    setError(null)
    setEditing(true)
  }

  async function save() {
    const parsedHours = parseHours(hours)
    if (parsedHours === null || parsedHours <= 0) return setError('Οι ώρες πρέπει να είναι θετικός αριθμός')
    setBusy(true); setError(null)
    const r = await api('PATCH', `/api/entries/${entry.id}`, {
      date,
      employeeId,
      clientId,
      hours: parsedHours,
      workType,
      notes,
    })
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'Η αποθήκευση απέτυχε')
    setEditing(false)
    router.refresh()
  }

  async function remove() {
    if (!confirm('Διαγραφή αυτής της καταχώρησης;')) return
    setBusy(true)
    const r = await api('DELETE', `/api/entries/${entry.id}`)
    setBusy(false)
    if (!r.ok) return setError(r.data.error ?? 'Η διαγραφή απέτυχε')
    router.refresh()
  }

  if (!editing) {
    return (
      <tr className="group border-t border-slate-50 hover:bg-slate-50/60">
        <td className="px-5 py-3 tabular-nums text-slate-600">{shortDate(entry.date)}</td>
        <td className="px-5 py-3 text-slate-800">{entry.employee.name}</td>
        <td className="px-5 py-3 text-slate-600">{entry.client.name}</td>
        <td className="px-5 py-3 text-slate-500">{entry.workType ?? '—'}</td>
        {/* Notes come mostly from the employee terminal, so they are shown in
            full on hover rather than silently cut off. */}
        <td className="max-w-[220px] px-5 py-3 text-slate-500">
          {entry.notes ? (
            <span className="block truncate" title={entry.notes}>
              {entry.notes}
            </span>
          ) : (
            '—'
          )}
        </td>
        <td className="px-5 py-3 text-right tabular-nums text-slate-600">{hrs(entry.minutes / 60)}</td>
        <td className="px-5 py-3">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={startEdit}
              title="Επεξεργασία"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={remove}
              disabled={busy}
              title="Διαγραφή"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 size={15} />
            </button>
          </div>
          {error && <p className="mt-1 text-right text-xs text-red-600">{error}</p>}
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t border-slate-100 bg-blue-50/40">
      <td className="px-5 py-2.5">
        <DateField value={date} onCommit={setDate} inputClassName={rowInputCls} ariaLabel="Ημερομηνία" />
      </td>
      <td className="px-5 py-2.5">
        <select className={rowInputCls} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </td>
      <td className="px-5 py-2.5">
        <select className={rowInputCls} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </td>
      <td className="px-5 py-2.5">
        <input className={rowInputCls} value={workType} onChange={(e) => setWorkType(e.target.value)} placeholder="Είδος" />
      </td>
      <td className="px-5 py-2.5">
        <input
          className={rowInputCls}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          placeholder="Σημείωση"
        />
      </td>
      <td className="px-5 py-2.5">
        <input
          type="text"
          inputMode="decimal"
          className={`${rowInputCls} text-right`}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
      </td>
      <td className="px-5 py-2.5">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={save}
            disabled={busy}
            title="Αποθήκευση"
            className="rounded-lg bg-blue-600 p-1.5 text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            <Check size={15} />
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={busy}
            title="Άκυρο"
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50"
          >
            <X size={15} />
          </button>
        </div>
        {error && <p className="mt-1 text-right text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'

const rowInputCls =
  'w-full min-w-[110px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-400'

const searchInputCls =
  'w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400'

// Human-readable label for the active range, in dd/mm/yyyy.
function rangeLabel(from: string, to: string): string {
  const f = from ? shortDate(from) : null
  const t = to ? shortDate(to) : null
  if (f && t) return `${f} → ${t}`
  if (f) return `από ${f}`
  if (t) return `έως ${t}`
  return ''
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}
