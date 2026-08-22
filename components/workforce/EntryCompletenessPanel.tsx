'use client'

import { useState } from 'react'
import { CalendarCheck, ChevronDown, ClipboardCheck, TriangleAlert } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { KpiCard } from './KpiCard'
import { hrs, num, pct } from '@/lib/format'
import type { EmployeeCompletenessRow } from '@/lib/workforce'
import type { DayLogEntry } from '@/lib/profitability'

// "Can I trust the data I am seeing for this employee?" — nothing more.
// Deliberately not a score and not an attendance system: it compares the days
// someone was employed against the days they actually logged, and lets the
// owner open the calendar behind the number.

const dayFmt = new Intl.DateTimeFormat('el-GR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const fullFmt = new Intl.DateTimeFormat('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

function formatDay(iso: string): string {
  return dayFmt.format(new Date(`${iso}T00:00:00Z`))
}

function formatDate(iso: string | null): string | null {
  return iso ? fullFmt.format(new Date(iso)) : null
}

/* ── overview: the KPI card itself is the trigger ─────────────── */

export function EntryCompletenessSection({
  value,
  sub,
  tooltip,
  rows,
  children,
}: {
  value: string
  sub?: string
  tooltip?: string
  rows: EmployeeCompletenessRow[]
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {children}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <KpiCard
            icon={ClipboardCheck}
            label="Entries Completed"
            value={value}
            sub={sub}
            tooltip={tooltip}
          />
        </button>
      </div>

      {open && <CompletenessList rows={rows} />}
    </>
  )
}

/* ── employees page: a plain collapsible card ─────────────────── */

export function EntryCompletenessCard({
  rows,
  completeness,
}: {
  rows: EmployeeCompletenessRow[]
  completeness: number | null
}) {
  const [open, setOpen] = useState(false)
  const missing = rows.reduce((s, r) => s + r.missingDays, 0)

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
        >
          <span className="flex items-center gap-2.5">
            <CalendarCheck size={16} className="shrink-0 text-blue-600" />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Πληρότητα καταχωρήσεων</span>
              <span className="block text-xs text-slate-400">
                {completeness !== null ? `${pct(completeness)} των αναμενόμενων ημερών` : 'Χωρίς αναμενόμενες ημέρες'}
                {missing > 0 && ` · ${num(missing)} ημέρες χωρίς καταχώρηση`}
              </span>
            </span>
          </span>
          <ChevronDown size={16} className={'shrink-0 text-slate-400 transition ' + (open ? 'rotate-180' : '')} />
        </button>
      </Card>

      {open && <CompletenessList rows={rows} />}
    </div>
  )
}

/* ── the list itself ──────────────────────────────────────────── */

function CompletenessList({ rows }: { rows: EmployeeCompletenessRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-slate-400">
        Κανένας εργαζόμενος με δεδομένα σε αυτή την περίοδο.
      </Card>
    )
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <EmployeeCompleteness key={row.id} row={row} />
      ))}
    </div>
  )
}

function EmployeeCompleteness({ row }: { row: EmployeeCompletenessRow }) {
  const [open, setOpen] = useState(false)

  const started = formatDate(row.employment.startedOn)
  const ended = formatDate(row.employment.endedOn)
  const firstEntry = formatDate(row.employment.firstEntryOn)

  // With no recorded dates the honest line is the observed one, under its own
  // label — never a hire date we made up.
  const employmentLine =
    row.employment.source === 'recorded'
      ? `Εργασία: ${started ?? '—'} → ${ended ?? 'σήμερα'}`
      : firstEntry
        ? `Πρώτη καταγραφή: ${firstEntry} · ημερομηνία πρόσληψης δεν έχει οριστεί`
        : 'Ημερομηνία πρόσληψης δεν έχει οριστεί'

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-slate-900">{row.name}</span>
              <span
                className={
                  'rounded-full px-2 py-0.5 text-[10px] font-medium ' +
                  (row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')
                }
              >
                {row.status === 'active' ? 'Ενεργός' : 'Πρώην εργαζόμενος'}
              </span>
            </span>
            <p className="mt-0.5 text-xs text-slate-400">{employmentLine}</p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-right">
              <span className="block font-display text-lg font-semibold leading-none tabular-nums text-slate-900">
                {row.completeness !== null ? pct(row.completeness) : '—'}
              </span>
              <span className="block text-[11px] text-slate-400">πληρότητα</span>
            </span>
            <ChevronDown size={16} className={'text-slate-400 transition ' + (open ? 'rotate-180' : '')} />
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <Figure label="Αναμενόμενες ημέρες" value={num(row.expectedWorkingDays)} />
          <Figure label="Ημέρες με καταχώρηση" value={num(row.daysWithEntries)} />
          <Figure
            label="Ημέρες χωρίς καταχώρηση"
            value={num(row.missingDays)}
            tone={row.missingDays > 0 ? 'warn' : undefined}
          />
          <Figure label="Αναμενόμενες ώρες" value={hrs(row.expectedHours)} />
          <Figure label="Καταχωρημένες ώρες" value={hrs(row.loggedHours)} />
        </div>
      </button>

      {open && <DayLog days={row.days} />}
    </Card>
  )
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <div>
      <p className={'text-sm font-semibold tabular-nums ' + (tone === 'warn' ? 'text-amber-600' : 'text-slate-800')}>
        {value}
      </p>
      <p className="text-[11px] leading-tight text-slate-400">{label}</p>
    </div>
  )
}

function DayLog({ days }: { days: DayLogEntry[] }) {
  if (days.length === 0) {
    return (
      <p className="border-t border-slate-100 px-5 py-5 text-center text-xs text-slate-400">
        Καμία εργάσιμη ημέρα σε αυτή την περίοδο.
      </p>
    )
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
      <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">Ανά ημέρα</p>
      <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {days.map((day) => (
          <li
            key={day.date}
            className="flex items-center justify-between gap-3 border-b border-slate-200/50 py-1 text-sm last:border-0"
          >
            <span className="text-slate-500">{formatDay(day.date)}</span>
            <span
              className={
                'flex items-center gap-1.5 tabular-nums ' +
                (day.status === 'missing'
                  ? 'text-amber-600'
                  : day.status === 'short'
                    ? 'text-amber-600'
                    : 'text-slate-700')
              }
            >
              {day.status === 'missing' ? 'Καμία καταχώρηση' : hrs(day.hours)}
              {day.status !== 'ok' && <TriangleAlert size={13} className="shrink-0" />}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
