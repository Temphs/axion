'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
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
  entryCount: number
}

export function ClientsManager({ initial, lang }: { initial: Client[]; lang: string }) {
  const router = useRouter()
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [billable, setBillable] = useState(true)
  const [monthlyRevenue, setMonthlyRevenue] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')

  // Merge dialog state
  const [mergeSource, setMergeSource] = useState<Client | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [mergeQuery, setMergeQuery] = useState('')
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)

  const filtered = query.trim()
    ? initial.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : initial

  const mergeCandidates = mergeSource
    ? initial.filter(
        (c) =>
          c.id !== mergeSource.id &&
          (!mergeQuery.trim() || c.name.toLowerCase().includes(mergeQuery.trim().toLowerCase()))
      )
    : []
  const mergeTarget = mergeTargetId ? initial.find((c) => c.id === mergeTargetId) ?? null : null

  function reset() {
    setEditId(null); setName(''); setBillable(true); setMonthlyRevenue(''); setNotes(''); setError(null)
  }
  function startEdit(c: Client) {
    setEditId(c.id); setName(c.name); setBillable(c.billable); setMonthlyRevenue(String(c.monthlyRevenue)); setNotes(c.notes ?? ''); setError(null)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
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

  function openMerge(c: Client) {
    setMergeSource(c); setMergeTargetId(''); setMergeQuery(''); setMergeError(null)
  }
  function closeMerge() {
    if (merging) return
    setMergeSource(null); setMergeTargetId(''); setMergeQuery(''); setMergeError(null)
  }
  async function doMerge() {
    if (!mergeSource || !mergeTargetId) return
    setMerging(true); setMergeError(null)
    const r = await api('POST', `/api/clients/${mergeSource.id}/merge`, { into: mergeTargetId })
    setMerging(false)
    if (!r.ok) return setMergeError(r.data.error ?? 'Σφάλμα')
    setMergeSource(null); setMergeTargetId(''); setMergeQuery(''); setMergeError(null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Πελάτες</h1>
        <p className="mt-0.5 text-sm text-blue-200/80">
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
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-3">
          <div className="relative w-full max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Αναζήτηση πελάτη…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <span className="shrink-0 text-xs text-slate-400">{filtered.length} / {initial.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Πελάτης</th>
                <th className="px-5 py-3 font-medium">Τύπος</th>
                <th className="px-5 py-3 text-right font-medium">Ώρες/μήνα</th>
                <th className="px-5 py-3 text-right font-medium">Κόστος μισθών/μήνα</th>
                <th className="px-5 py-3 text-right font-medium">Μηνιαίο έσοδο</th>
                <th className="px-5 py-3 text-right font-medium">Καθαρό κέρδος/μήνα</th>
                <th className="px-5 py-3 text-center font-medium">Κατάσταση</th>
                <th className="px-5 py-3 text-right font-medium">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">{initial.length === 0 ? 'Κανένας πελάτης ακόμη' : 'Δεν βρέθηκαν αποτελέσματα'}</td></tr>
              )}
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/${lang}/dashboard/clients/${c.id}`)}
                  className="cursor-pointer border-t border-slate-50 hover:bg-blue-50/40"
                >
                  <td className="px-5 py-3 text-slate-800">
                    <span className="font-medium text-blue-600">{c.name}</span>
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
                  <td className="px-5 py-3 text-right tabular-nums">
                    {c.billable ? (
                      <span className={'font-medium ' + (c.monthlyRevenue - c.cost >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {eur(c.monthlyRevenue - c.cost)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={(e) => { e.stopPropagation(); toggle(c) }} className={'rounded-full px-2.5 py-0.5 text-xs font-medium ' + (c.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                      {c.active ? 'Ενεργός' : 'Ανενεργός'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={(e) => { e.stopPropagation(); startEdit(c) }} className="text-blue-600 hover:underline">Επεξεργασία</button>
                      <button onClick={(e) => { e.stopPropagation(); openMerge(c) }} className="text-slate-500 hover:underline">Συγχώνευση με</button>
                      <button onClick={(e) => { e.stopPropagation(); remove(c) }} className="text-red-500 hover:underline">Διαγραφή</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {mergeSource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={closeMerge}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-slate-900">Συγχώνευση πελάτη</h2>
            <p className="mt-1 text-sm text-slate-500">
              Επιλέξτε τον πελάτη που θα <strong className="text-slate-700">διατηρηθεί</strong>. Όλες οι καταχωρήσεις
              του <strong className="text-slate-700">«{mergeSource.name}»</strong> ({mergeSource.entryCount}) θα
              μεταφερθούν σε αυτόν και ο «{mergeSource.name}» θα διαγραφεί.
            </p>

            <div className="relative mt-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={mergeQuery}
                onChange={(e) => setMergeQuery(e.target.value)}
                placeholder="Αναζήτηση πελάτη προς διατήρηση…"
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-100">
              {mergeCandidates.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-400">Δεν βρέθηκαν πελάτες</p>
              ) : (
                mergeCandidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setMergeTargetId(c.id)}
                    className={
                      'flex w-full items-center justify-between gap-3 border-b border-slate-50 px-3 py-2 text-left text-sm last:border-0 ' +
                      (mergeTargetId === c.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50')
                    }
                  >
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{c.entryCount} καταχ.</span>
                  </button>
                ))
              )}
            </div>

            {mergeTarget && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                «{mergeSource.name}» → <strong className="text-slate-800">«{mergeTarget.name}»</strong>
              </p>
            )}
            {mergeError && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{mergeError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeMerge}
                disabled={merging}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Άκυρο
              </button>
              <button
                type="button"
                onClick={doMerge}
                disabled={!mergeTargetId || merging}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {merging ? 'Συγχώνευση…' : 'Συγχώνευση'}
              </button>
            </div>
          </div>
        </div>
      )}
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
