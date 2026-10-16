'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { api } from '@/components/dashboard/api'
import { DateField } from '@/components/dashboard/DateField'
import { hrs, shortDate } from '@/lib/format'
import { todayInGreece } from '@/lib/datetime'

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

// Greek "today", identical on the server render and in the browser.
const today = () => todayInGreece()

// yyyy-mm-dd from an ISO timestamp, for the inline date editor.
function isoDay(value: string): string {
  return value.slice(0, 10)
}

export function EntriesManager({
  entries,
  employees,
  clients,
  from,
  to,
  employeeId,
  q,
  page,
  pageSize,
  total,
  totalHours,
}: {
  entries: Entry[]
  employees: Ref[]
  clients: Ref[]
  from: string
  to: string
  employeeId: string
  q: string
  page: number
  pageSize: number
  total: number
  totalHours: number
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
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // The search box keeps a local draft so typing doesn't refetch on every key.
  // When q changes in the URL (back button, cleared filters) the draft is reset
  // during render — React's documented alternative to syncing state in an effect.
  const [query, setQuery] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    setQuery(q)
  }

  const canAdd = activeEmployees.length > 0 && activeClients.length > 0

  // Phones keep the page light: the add form and the extra filters stay
  // folded behind a button until needed. Tablets and desktop always show them.
  const [formOpen, setFormOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(Boolean(employeeId || from || to))
  const extraFilters = (employeeId ? 1 : 0) + (from || to ? 1 : 0)

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!date) return setError('Η ημερομηνία είναι υποχρεωτική')
    setSaving(true); setError(null)
    const r = await api('POST', '/api/entries', {
      date, employeeId: newEmployeeId, clientId, hours: Number(hours) || 0, workType,
    })
    setSaving(false)
    if (!r.ok) return setError(r.data.error ?? 'Σφάλμα')
    setHours(''); setWorkType('')
    router.refresh()
  }

  // All list filters live in the URL so the view is shareable and survives refresh.
  function setFilters(updates: Record<string, string>, keepPage = false) {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (!keepPage) next.delete('page')
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const filtering = Boolean(from || to || employeeId || q)
  const filteredEmployeeName = employeeId ? employees.find((e) => e.id === employeeId)?.name : null
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const firstShown = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastShown = (page - 1) * pageSize + entries.length

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Καταχωρήσεις εργασίας</h1>
        <p className="mt-0.5 hidden text-sm text-blue-200/80 sm:block">
          Ιστορικό ωρών — προσθέστε, διορθώστε ή διαγράψτε καταχωρήσεις
        </p>
      </header>

      {!formOpen && (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-blue-700 shadow-sm active:bg-blue-50 md:hidden"
        >
          <Plus size={18} /> Νέα καταχώρηση
        </button>
      )}

      <Card className={`p-5 ${formOpen ? '' : 'hidden md:block'}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Νέα καταχώρηση</h2>
          <button
            type="button"
            onClick={() => setFormOpen(false)}
            aria-label="Κλείσιμο φόρμας"
            className="-my-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 md:hidden"
          >
            <X size={16} />
          </button>
        </div>
        {!canAdd ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Προσθέστε πρώτα τουλάχιστον έναν ενεργό εργαζόμενο και έναν ενεργό πελάτη.
          </p>
        ) : (
          <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:items-end">
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
              <input type="number" inputMode="decimal" min="0" step="0.25" className={inputCls} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="1.5" required />
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
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              {filtering ? 'Ιστορικό καταχωρήσεων' : 'Όλες οι καταχωρήσεις'}
            </h2>
            <p className="text-xs text-slate-500">
              {total} {total === 1 ? 'καταχώρηση' : 'καταχωρήσεις'} · {hrs(totalHours)}
              {q && ` · «${q}»`}
              {filteredEmployeeName && ` · ${filteredEmployeeName}`}
              {from && to && ` · ${rangeLabel(from, to)}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <form
              onSubmit={(ev) => {
                ev.preventDefault()
                setFilters({ q: query.trim() })
              }}
              className="relative min-w-0 flex-1 sm:flex-none"
            >
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(ev) => setQuery(ev.target.value)}
                onBlur={() => query.trim() !== q && setFilters({ q: query.trim() })}
                placeholder="Αναζήτηση σε όλο το ιστορικό…"
                aria-label="Αναζήτηση καταχωρήσεων"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-9 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 sm:w-56 sm:py-1.5"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setFilters({ q: '' }) }}
                  aria-label="Καθαρισμός αναζήτησης"
                  className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:text-slate-700"
                >
                  <X size={13} />
                </button>
              )}
            </form>
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              className={`flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium md:hidden ${
                filtersOpen || extraFilters ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <SlidersHorizontal size={15} />
              Φίλτρα{extraFilters > 0 && ` (${extraFilters})`}
            </button>
            <div className={`w-full flex-wrap items-center gap-1.5 md:flex md:w-auto ${filtersOpen ? 'flex' : 'hidden'}`}>
            <select
              value={employeeId}
              onChange={(e) => setFilters({ employeeId: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 sm:w-auto sm:py-1.5"
            >
              <option value="">Όλοι οι εργαζόμενοι</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}{e.active === false ? ' (ανενεργός)' : ''}
                </option>
              ))}
            </select>
            <span className="ml-1 hidden text-xs font-medium text-slate-500 sm:inline">Διάστημα</span>
            <div className="flex w-full items-center gap-1.5 sm:w-auto">
              <DateField value={from} onCommit={(v) => setFilters({ from: v })} ariaLabel="Από" inputClassName={searchInputCls} className="min-w-0 flex-1 sm:flex-none" />
              <span className="text-slate-400">→</span>
              <DateField value={to} onCommit={(v) => setFilters({ to: v })} ariaLabel="Έως" inputClassName={searchInputCls} className="min-w-0 flex-1 sm:flex-none" />
            </div>
            {filtering && (
              <button
                onClick={() => { setQuery(''); setFilters({ from: '', to: '', employeeId: '', q: '' }) }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              >
                Καθαρισμός
              </button>
            )}
            </div>
          </div>
        </div>

        {/* Phones: one card per entry. */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {entries.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-slate-400">
              {filtering ? 'Καμία καταχώρηση με αυτά τα φίλτρα' : 'Καμία καταχώρηση ακόμη'}
            </li>
          )}
          {entries.map((e) => (
            <EntryCard key={e.id} entry={e} employees={employees} clients={clients} />
          ))}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
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
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  {filtering ? 'Καμία καταχώρηση με αυτά τα φίλτρα' : 'Καμία καταχώρηση ακόμη'}
                </td></tr>
              )}
              {entries.map((e) => (
                <EntryRow key={e.id} entry={e} employees={employees} clients={clients} />
              ))}
            </tbody>
          </table>
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <p className="text-xs tabular-nums text-slate-500">
              {firstShown}–{lastShown} από {total}
            </p>
            <div className="flex items-center gap-1.5">
              <PageButton
                disabled={page <= 1}
                onClick={() => setFilters({ page: String(page - 1) }, true)}
                label="Προηγούμενη σελίδα"
              >
                <ChevronLeft size={14} /> Προηγούμενη
              </PageButton>
              <span className="px-1 text-xs tabular-nums text-slate-500">
                {page} / {pageCount}
              </span>
              <PageButton
                disabled={page >= pageCount}
                onClick={() => setFilters({ page: String(page + 1) }, true)}
                label="Επόμενη σελίδα"
              >
                Επόμενη <ChevronRight size={14} />
              </PageButton>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function PageButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 sm:min-h-0 sm:px-2.5 transition hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}

/* ─── entry editing ──────────────────────────────────────────── */

// Edit/save/delete state for one entry, shared by the table row (desktop)
// and the card (phones).
function useEntryEditor(entry: Entry) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  // Close the editor only once the refreshed list has arrived, so a slow
  // phone connection never shows the old value right after "Αποθήκευση".
  const [refreshing, startTransition] = useTransition()
  const busy = saving || refreshing
  const [error, setError] = useState<string | null>(null)

  const [date, setDate] = useState(isoDay(entry.date))
  const [employeeId, setEmployeeId] = useState(entry.employee.id)
  const [clientId, setClientId] = useState(entry.client.id)
  const [hours, setHours] = useState(String(entry.minutes / 60))
  const [workType, setWorkType] = useState(entry.workType ?? '')

  function startEdit() {
    setDate(isoDay(entry.date))
    setEmployeeId(entry.employee.id)
    setClientId(entry.client.id)
    setHours(String(entry.minutes / 60))
    setWorkType(entry.workType ?? '')
    setError(null)
    setEditing(true)
  }

  async function save() {
    setSaving(true); setError(null)
    const r = await api('PATCH', `/api/entries/${entry.id}`, {
      date,
      employeeId,
      clientId,
      hours: Number(hours.replace(',', '.')) || 0,
      workType,
    })
    setSaving(false)
    if (!r.ok) return setError(r.data.error ?? 'Η αποθήκευση απέτυχε')
    startTransition(() => {
      setEditing(false)
      router.refresh()
    })
  }

  async function remove() {
    if (!confirm('Διαγραφή αυτής της καταχώρησης;')) return
    setSaving(true)
    const r = await api('DELETE', `/api/entries/${entry.id}`)
    setSaving(false)
    if (!r.ok) return setError(r.data.error ?? 'Η διαγραφή απέτυχε')
    startTransition(() => router.refresh())
  }

  return {
    editing, setEditing, busy, error, startEdit, save, remove,
    date, setDate, employeeId, setEmployeeId, clientId, setClientId, hours, setHours, workType, setWorkType,
  }
}

/* ─── one card (phones) ─────────────────────────────────────── */

function EntryCard({ entry, employees, clients }: { entry: Entry; employees: Ref[]; clients: Ref[] }) {
  const ed = useEntryEditor(entry)

  if (!ed.editing) {
    return (
      <li className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">{entry.client.name}</span>
            <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{hrs(entry.minutes / 60)}</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {shortDate(entry.date)} · {entry.employee.name}
            {entry.workType ? ` · ${entry.workType}` : ''}
          </p>
          {ed.error && <p className="mt-1 text-xs text-red-600">{ed.error}</p>}
        </div>
        <div className="flex shrink-0 items-center">
          <button
            onClick={ed.startEdit}
            aria-label={`Επεξεργασία: ${entry.client.name}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 active:bg-blue-50 active:text-blue-600"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={ed.remove}
            disabled={ed.busy}
            aria-label={`Διαγραφή: ${entry.client.name}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 active:bg-red-50 active:text-red-600 disabled:opacity-50"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="space-y-2.5 bg-blue-50/40 px-4 py-3">
      <Field label="Ημερομηνία">
        <DateField value={ed.date} onCommit={ed.setDate} inputClassName={inputCls} ariaLabel="Ημερομηνία" />
      </Field>
      <Field label="Εργαζόμενος">
        <select className={inputCls} value={ed.employeeId} onChange={(e) => ed.setEmployeeId(e.target.value)}>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </Field>
      <Field label="Πελάτης">
        <select className={inputCls} value={ed.clientId} onChange={(e) => ed.setClientId(e.target.value)}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Ώρες">
          <input type="number" inputMode="decimal" min="0" step="0.25" className={inputCls} value={ed.hours} onChange={(e) => ed.setHours(e.target.value)} />
        </Field>
        <Field label="Είδος">
          <input className={inputCls} value={ed.workType} onChange={(e) => ed.setWorkType(e.target.value)} placeholder="Είδος" />
        </Field>
      </div>
      {ed.error && <p className="text-xs text-red-600">{ed.error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          onClick={ed.save}
          disabled={ed.busy}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Check size={16} /> Αποθήκευση
        </button>
        <button
          onClick={() => ed.setEditing(false)}
          disabled={ed.busy}
          className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600"
        >
          Άκυρο
        </button>
      </div>
    </li>
  )
}

/* ─── one table row (desktop) ───────────────────────────────── */

function EntryRow({ entry, employees, clients }: { entry: Entry; employees: Ref[]; clients: Ref[] }) {
  const {
    editing, setEditing, busy, error, startEdit, save, remove,
    date, setDate, employeeId, setEmployeeId, clientId, setClientId, hours, setHours, workType, setWorkType,
  } = useEntryEditor(entry)

  if (!editing) {
    return (
      <tr className="group border-t border-slate-50 hover:bg-slate-50/60">
        <td className="px-5 py-3 tabular-nums text-slate-600">{shortDate(entry.date)}</td>
        <td className="px-5 py-3 text-slate-800">{entry.employee.name}</td>
        <td className="px-5 py-3 text-slate-600">{entry.client.name}</td>
        <td className="px-5 py-3 text-slate-500">{entry.workType ?? '—'}</td>
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
          type="number"
          min="0"
          step="0.25"
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
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 sm:w-36 sm:py-1.5'

// Human-readable label for the active range, in dd/mm/yyyy.
function rangeLabel(from: string, to: string): string {
  const f = from ? shortDate(from) : null
  const t = to ? shortDate(to) : null
  if (f && t) return `${f} → ${t}`
  if (f) return `από ${f}`
  if (t) return `έως ${t}`
  return ''
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}
