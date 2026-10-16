'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { BottomSheet } from '@/components/dashboard/BottomSheet'
import { DateField } from '@/components/dashboard/DateField'

const dateInputCls =
  'w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-blue-400'
const sheetInputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 outline-none focus:border-blue-400'

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Preset = 'thisWeek' | 'thisMonth' | 'lastMonth' | 'quarter' | 'ytd' | 'all'

// [key, short label for the desktop row, full label for the phone sheet]
const PRESETS: [Preset, string, string][] = [
  ['thisWeek', 'Εβδομάδα', 'Αυτή η εβδομάδα'],
  ['thisMonth', 'Μήνας', 'Αυτός ο μήνας'],
  ['lastMonth', 'Προηγ.', 'Προηγούμενος μήνας'],
  ['quarter', 'Τρίμηνο', 'Αυτό το τρίμηνο'],
  ['ytd', 'Έτος', 'Από αρχή έτους'],
  ['all', 'Όλα', 'Όλα'],
]

function shortDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : ''
}

export function DateRangeFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const [sheetOpen, setSheetOpen] = useState(false)
  const closeSheet = () => setSheetOpen(false)

  // Which preset is showing. The preset travels in the URL (`p`) so the label
  // never depends on the clock of whoever renders it (server vs. phone).
  const current: Preset | 'custom' =
    params.get('range') === 'all'
      ? 'all'
      : !from && !to
        ? 'thisMonth' // the server's default period
        : (PRESETS.find(([k]) => k === params.get('p'))?.[0] ?? 'custom')
  const currentLabel =
    current === 'custom'
      ? `${shortDay(from) || '…'} – ${shortDay(to) || '…'}`
      : PRESETS.find(([k]) => k === current)![2]

  function apply(nextFrom: string, nextTo: string, opts: { range?: 'all'; preset?: Preset } = {}) {
    const q = new URLSearchParams()
    if (opts.range) q.set('range', opts.range)
    if (opts.preset) q.set('p', opts.preset)
    if (nextFrom) q.set('from', nextFrom)
    if (nextTo) q.set('to', nextTo)
    const qs = q.toString()
    setSheetOpen(false)
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function preset(kind: Preset) {
    const now = new Date()
    // "Όλα" = the full span of recorded entries (first → last), skipping
    // months without data; resolved server-side.
    if (kind === 'all') return apply('', '', { range: 'all' })
    const p = { preset: kind }
    if (kind === 'thisWeek') {
      const day = (now.getDay() + 6) % 7 // Monday-based
      return apply(iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)), iso(now), p)
    }
    if (kind === 'thisMonth') {
      return apply(iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now), p)
    }
    if (kind === 'lastMonth') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return apply(iso(start), iso(end), p)
    }
    if (kind === 'quarter') {
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      return apply(iso(qStart), iso(now), p)
    }
    return apply(iso(new Date(now.getFullYear(), 0, 1)), iso(now), p) // ytd
  }

  return (
    <>
      {/* Phones: one compact button showing the period; the choices live in a sheet. */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label={`Περίοδος: ${currentLabel}`}
        className="inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-white/25 bg-white/15 px-3.5 text-sm font-medium text-white backdrop-blur-sm active:bg-white/25 sm:hidden"
      >
        <CalendarDays size={16} className="shrink-0 opacity-80" />
        {currentLabel}
        <ChevronDown size={16} className="shrink-0 opacity-70" />
      </button>

      <BottomSheet open={sheetOpen} onClose={closeSheet} title="Περίοδος" subtitle={currentLabel} className="sm:hidden">
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map(([k, , label]) => (
            <button
              key={k}
              type="button"
              onClick={() => preset(k)}
              aria-pressed={current === k}
              className={
                'min-h-[48px] rounded-2xl px-3 text-sm font-medium transition ' +
                (current === k ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700 active:bg-slate-100')
              }
            >
              {label}
            </button>
          ))}
        </div>
        <CustomRange from={from} to={to} onApply={(f, t) => apply(f, t)} />
      </BottomSheet>

      {/* Tablets and desktop: one segmented row plus the two date fields. */}
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
          {PRESETS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => preset(k)}
              aria-pressed={current === k}
              title={k === 'all' ? 'Όλο το ιστορικό εγγραφών (χωρίς κενούς μήνες)' : undefined}
              className={
                'border-r border-slate-100 px-3 py-1.5 font-medium transition last:border-r-0 ' +
                (current === k ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600')
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <DateField value={from} onCommit={(v) => apply(v, to)} ariaLabel="Από" inputClassName={dateInputCls} />
          <span className="text-slate-400">→</span>
          <DateField value={to} onCommit={(v) => apply(from, v)} ariaLabel="Έως" inputClassName={dateInputCls} />
        </div>
      </div>
    </>
  )
}

// Custom from/to inside the sheet: picked first, applied with one button, so
// choosing the start date doesn't reload the page before the end is set.
function CustomRange({ from, to, onApply }: { from: string; to: string; onApply: (from: string, to: string) => void }) {
  const [f, setF] = useState(from)
  const [t, setT] = useState(to)
  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Συγκεκριμένες ημερομηνίες</p>
      <div className="grid grid-cols-2 gap-2">
        <DateField value={f} onCommit={setF} ariaLabel="Από" inputClassName={sheetInputCls} className="min-w-0" />
        <DateField value={t} onCommit={setT} ariaLabel="Έως" inputClassName={sheetInputCls} className="min-w-0" />
      </div>
      <button
        type="button"
        disabled={!f && !t}
        onClick={() => onApply(f, t)}
        className="mt-2 h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white disabled:opacity-40"
      >
        Εφαρμογή
      </button>
    </div>
  )
}
