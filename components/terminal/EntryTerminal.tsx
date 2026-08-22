'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Loader2, Pencil, Search, Trash2, X } from 'lucide-react'
import type { TerminalClient, TerminalData } from '@/lib/terminal'

// Three taps: which client, how many hours, done. Everything else — search,
// work type, corrections — stays out of the way until it is needed.
//
// The employee never sees cost, revenue or a percentage. This screen is their
// tool for recording what they did, not a report about them.

const HOUR_PRESETS = [0.5, 1, 2, 4, 8]
const SEARCH_RESULTS = 20

const dayFmt = new Intl.DateTimeFormat('el-GR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function shiftIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function dayLabel(iso: string): string {
  const today = todayIso()
  if (iso === today) return 'Σήμερα'
  if (iso === shiftIso(today, -1)) return 'Χθες'
  return dayFmt.format(new Date(`${iso}T00:00:00Z`))
}

function formatHours(value: number): string {
  return `${new Intl.NumberFormat('el-GR', { maximumFractionDigits: 2 }).format(value)} ώ`
}

export function EntryTerminal({ token, initial }: { token: string; initial: TerminalData }) {
  const [data, setData] = useState(initial)
  const [date, setDate] = useState(initial.date)
  const [clientId, setClientId] = useState('')
  const [hours, setHours] = useState<number | null>(null)
  const [customHours, setCustomHours] = useState('')
  const [workType, setWorkType] = useState('')
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const isToday = date === todayIso()
  const chosenHours = hours ?? (customHours.trim() ? Number(customHours.replace(',', '.')) : null)
  const canSubmit = !!clientId && !!chosenHours && chosenHours > 0 && !busy

  // The picked client may come from search, so look through the full list.
  const clientName = useMemo(
    () => data.allClients.find((c) => c.id === clientId)?.name ?? '',
    [data.allClients, clientId]
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data.allClients.slice(0, SEARCH_RESULTS)
    return data.allClients.filter((c) => c.name.toLowerCase().includes(q)).slice(0, SEARCH_RESULTS)
  }, [data.allClients, query])

  function resetForm() {
    setClientId('')
    setHours(null)
    setCustomHours('')
    setWorkType('')
    setNotes('')
    setEditingId(null)
    setSearching(false)
    setQuery('')
  }

  async function call(path: string, init: RequestInit) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/terminal/${token}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json' },
      })
      const payload = await res.json()
      if (!res.ok) {
        setError(payload.error ?? 'Κάτι πήγε στραβά')
        return false
      }
      setData(payload)
      setDate(payload.date)
      return true
    } catch {
      setError('Δεν υπάρχει σύνδεση — δοκιμάστε ξανά')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function loadDay(nextDate: string) {
    setDate(nextDate)
    resetForm()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/terminal/${token}/session?date=${nextDate}`)
      if (res.ok) setData(await res.json())
    } catch {
      setError('Δεν υπάρχει σύνδεση — δοκιμάστε ξανά')
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    if (!canSubmit) return
    // Sent even when empty: that is how clearing a note or a work type during
    // a correction actually reaches the database.
    const body = { date, clientId, hours: chosenHours, workType, notes }
    const okResult = editingId
      ? await call(`/entries/${editingId}`, { method: 'PATCH', body: JSON.stringify(body) })
      : await call('/entries', { method: 'POST', body: JSON.stringify(body) })
    if (okResult) {
      resetForm()
      setSaved(true)
      setTimeout(() => setSaved(false), 1600)
    }
  }

  function startEdit(entryId: string) {
    const entry = data.entries.find((e) => e.id === entryId)
    if (!entry || !entry.editable) return
    setEditingId(entry.id)
    setClientId(entry.clientId)
    const preset = HOUR_PRESETS.includes(entry.hours)
    setHours(preset ? entry.hours : null)
    setCustomHours(preset ? '' : String(entry.hours))
    setWorkType(entry.workType ?? '')
    setNotes(entry.notes ?? '')
    setSearching(false)
    setQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function remove(entryId: string) {
    if (!confirm('Διαγραφή αυτής της καταχώρησης;')) return
    await call(`/entries/${entryId}`, { method: 'DELETE' })
    if (editingId === entryId) resetForm()
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      {/* header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-blue-700 to-blue-500 px-5 pb-8 pt-7 text-white">
        {/* soft depth — two blurred orbs and a faint grid, no animation so the
            screen stays calm and cheap on an old phone */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-sky-300/25 blur-3xl" />
          <div className="absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-indigo-400/25 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:34px_34px] [mask-image:radial-gradient(ellipse_70%_60%_at_70%_0%,#000_30%,transparent_100%)]" />
        </div>

        <div className="relative">
        <p className="text-sm text-blue-100">Γεια σου</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">{data.employeeName}</h1>

        <div className="mt-5 flex items-center justify-between gap-2 rounded-2xl bg-white/15 p-1.5 backdrop-blur">
          <button
            type="button"
            onClick={() => loadDay(shiftIso(date, -1))}
            aria-label="Προηγούμενη ημέρα"
            className="flex h-11 w-11 items-center justify-center rounded-xl transition active:bg-white/20"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-center">
            <span className="block text-base font-semibold leading-tight">{dayLabel(date)}</span>
            <span className="block text-xs text-blue-100">{formatHours(data.dayHours)} καταγεγραμμένες</span>
          </span>
          <button
            type="button"
            onClick={() => loadDay(shiftIso(date, 1))}
            disabled={isToday}
            aria-label="Επόμενη ημέρα"
            className="flex h-11 w-11 items-center justify-center rounded-xl transition active:bg-white/20 disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* the day at a glance: one segment per entry, widths proportional to
            hours. Descriptive only — no target, no score. */}
        {data.entries.length > 0 && (
          <div className="mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
            {data.entries.map((entry, i) => (
              <span
                key={entry.id}
                title={`${entry.clientName} · ${formatHours(entry.hours)}`}
                className="h-full rounded-full bg-white/80"
                style={{
                  width: `${(entry.hours / data.dayHours) * 100}%`,
                  opacity: 1 - i * 0.13,
                }}
              />
            ))}
          </div>
        )}
        </div>
      </header>

      <main className="mx-auto -mt-4 max-w-xl space-y-3 px-3">
        {/* ── the form ─────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          {editingId && (
            <div className="mb-3 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Διόρθωση καταχώρησης
              <button type="button" onClick={resetForm} className="font-medium text-amber-700 underline">
                Άκυρο
              </button>
            </div>
          )}

          <Label>Πελάτης</Label>
          {searching ? (
            <ClientSearch
              query={query}
              onQuery={setQuery}
              results={results}
              onPick={(c) => {
                setClientId(c.id)
                setSearching(false)
                setQuery('')
              }}
              onClose={() => {
                setSearching(false)
                setQuery('')
              }}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {data.recentClients.map((c) => (
                  <ChoiceButton key={c.id} active={clientId === c.id} onClick={() => setClientId(c.id)}>
                    {c.name}
                  </ChoiceButton>
                ))}
                {/* A client picked from search is not in the shortcut list, so
                    it gets its own button rather than vanishing. */}
                {clientId && !data.recentClients.some((c) => c.id === clientId) && (
                  <ChoiceButton active onClick={() => setSearching(true)}>
                    {clientName}
                  </ChoiceButton>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSearching(true)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition active:bg-slate-50"
              >
                <Search size={15} /> Άλλος πελάτης…
              </button>
            </>
          )}

          <Label className="mt-5">Ώρες</Label>
          <div className="flex flex-wrap gap-2">
            {HOUR_PRESETS.map((h) => (
              <ChoiceButton
                key={h}
                active={hours === h}
                onClick={() => {
                  setHours(h)
                  setCustomHours('')
                }}
                className="min-w-[64px] flex-1"
              >
                {new Intl.NumberFormat('el-GR').format(h)}
              </ChoiceButton>
            ))}
            <input
              inputMode="decimal"
              value={customHours}
              onChange={(e) => {
                setCustomHours(e.target.value)
                setHours(null)
              }}
              placeholder="Άλλο"
              aria-label="Άλλες ώρες"
              className={
                'min-w-[72px] flex-1 rounded-xl border-2 px-3 py-3 text-center text-base font-semibold outline-none transition ' +
                (customHours.trim()
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-700 focus:border-blue-400')
              }
            />
          </div>

          {data.workTypes.length > 0 && (
            <>
              <Label className="mt-5">Τι έκανες (προαιρετικό)</Label>
              <div className="flex flex-wrap gap-2">
                {data.workTypes.map((t) => (
                  <ChoiceButton
                    key={t}
                    active={workType === t}
                    onClick={() => setWorkType(workType === t ? '' : t)}
                  >
                    {t}
                  </ChoiceButton>
                ))}
              </div>
            </>
          )}

          <Label className="mt-5">Σημείωση (προαιρετικό)</Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="π.χ. τηλεφωνική επικοινωνία για ΦΠΑ"
            className="w-full resize-none rounded-xl border-2 border-slate-200 px-3 py-2.5 text-base leading-snug outline-none transition placeholder:text-slate-300 focus:border-blue-400"
          />

          {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-base font-semibold text-white transition active:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : saved ? <Check size={18} /> : null}
            {editingId ? 'Αποθήκευση' : saved ? 'Καταχωρήθηκε' : 'Καταχώρηση'}
          </button>
        </section>

        {/* ── what they logged that day ────────────────────────── */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-slate-900">{dayLabel(date)}</h2>
            <span className="font-display text-base font-bold tabular-nums text-slate-900">
              {formatHours(data.dayHours)}
            </span>
          </div>

          {data.entries.length === 0 ? (
            <div className="py-7 text-center">
              <EmptyDay />
              <p className="mt-3 text-sm text-slate-400">Καμία καταχώρηση ακόμη.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.entries.map((entry) => (
                <li key={entry.id} className="flex items-start gap-2 py-2.5">
                  <button
                    type="button"
                    onClick={() => startEdit(entry.id)}
                    disabled={!entry.editable}
                    className="min-w-0 flex-1 text-left disabled:opacity-60"
                  >
                    <span className="block truncate text-sm font-medium text-slate-800">{entry.clientName}</span>
                    {entry.workType && <span className="block truncate text-xs text-slate-400">{entry.workType}</span>}
                    {entry.notes && (
                      <span className="mt-0.5 block text-xs leading-snug text-slate-500">{entry.notes}</span>
                    )}
                  </button>
                  <span className="shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-slate-700">
                    {formatHours(entry.hours)}
                  </span>
                  {entry.editable && (
                    <>
                      {/* Tapping the row edits too, but a visible pencil is the
                          difference between a feature and a secret. */}
                      <button
                        type="button"
                        onClick={() => startEdit(entry.id)}
                        aria-label={`Επεξεργασία ${entry.clientName}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition active:bg-blue-50 active:text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(entry.id)}
                        aria-label={`Διαγραφή ${entry.clientName}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300 transition active:bg-red-50 active:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="px-2 pt-1 text-center text-[11px] text-slate-400">
          Πατήστε μια καταχώρηση για διόρθωση.
        </p>
      </main>
    </div>
  )
}

/* ── pieces ───────────────────────────────────────────────────── */

// A quiet placeholder for a day with nothing on it — three empty rows waiting
// to be filled, rather than a blank space that reads as an error.
function EmptyDay() {
  return (
    <svg viewBox="0 0 120 56" role="img" aria-hidden className="mx-auto h-14 w-auto">
      <rect x="6" y="6" width="108" height="12" rx="6" fill="#e2e8f0" />
      <rect x="6" y="24" width="82" height="12" rx="6" fill="#eef2f7" />
      <rect x="6" y="42" width="54" height="12" rx="6" fill="#f1f5f9" />
      <circle cx="100" cy="48" r="9" fill="#dbeafe" />
      <path d="M100 43.5v9M95.5 48h9" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${className}`}>
      {children}
    </p>
  )
}

function ChoiceButton({
  children,
  active,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  active?: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'truncate rounded-xl border-2 px-3 py-3 text-sm font-semibold transition ' +
        (active
          ? 'border-blue-600 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white text-slate-700 active:bg-slate-50') +
        ' ' +
        className
      }
    >
      {children}
    </button>
  )
}

function ClientSearch({
  query,
  onQuery,
  results,
  onPick,
  onClose,
}: {
  query: string
  onQuery: (v: string) => void
  results: TerminalClient[]
  onPick: (c: TerminalClient) => void
  onClose: () => void
}) {
  return (
    <div>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Όνομα πελάτη…"
          className="w-full rounded-xl border-2 border-slate-200 py-3 pl-9 pr-10 text-base outline-none focus:border-blue-400"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Κλείσιμο αναζήτησης"
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400"
        >
          <X size={18} />
        </button>
      </div>
      <ul className="mt-2 max-h-64 overflow-y-auto">
        {results.length === 0 && <li className="py-6 text-center text-sm text-slate-400">Κανένα αποτέλεσμα</li>}
        {results.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onPick(c)}
              className="w-full truncate border-b border-slate-50 py-3 text-left text-sm text-slate-700 transition active:bg-blue-50"
            >
              {c.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
