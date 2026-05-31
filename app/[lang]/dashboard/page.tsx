import Link from 'next/link'
import {
  Clock,
  Wallet,
  TrendingUp,
  CircleDollarSign,
  Activity,
  ChevronRight,
  Info,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { Donut, ProgressBar } from '@/components/axion/charts'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { OverviewClientsTable } from '@/components/dashboard/OverviewClientsTable'
import { buildStats, parseStatsFilter } from '@/lib/stats'
import { eur, hrs, num, pct } from '@/lib/format'

export default async function DashboardOverview({ params, searchParams }: PageProps<'/[lang]/dashboard'>) {
  const { lang } = await params
  const sp = await searchParams
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string') usp.set(k, v)
  const parsed = parseStatsFilter(usp)
  const stats = await buildStats('error' in parsed ? {} : parsed.filter)

  const { summary, clients, employees } = stats
  const empty = summary.entryCount === 0
  const topClients = clients.slice(0, 6)
  const maxHours = topClients[0]?.hours || 1

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Επισκόπηση
          </h1>
          <p className="mt-0.5 text-sm text-blue-200/80">
            Παραγωγικότητα &amp; κερδοφορία ανά πελάτη και εργαζόμενο
          </p>
        </div>
        <DateRangeFilter />
      </header>

      {empty ? (
        /* ── Empty state ────────────────────────────────────────── */
        <Card className="p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <Activity className="h-7 w-7 text-blue-600" />
          </div>
          <p className="text-lg font-semibold text-slate-900">Δεν υπάρχουν ακόμη καταχωρήσεις εργασίας</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Προσθέστε εργαζόμενους και πελάτες, και συνδέστε την εφαρμογή καταγραφής χρόνου μέσω API key ή καταχωρήστε χειροκίνητα.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href={`/${lang}/dashboard/employees`} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500">
              Εργαζόμενοι
            </Link>
            <Link href={`/${lang}/dashboard/clients`} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Πελάτες
            </Link>
            <Link href={`/${lang}/dashboard/api-keys`} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              API Keys
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* ── Revenue notice ───────────────────────────────────── */}
          {summary.revenue === 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="text-sm">
                <span className="font-semibold text-amber-800">Τα μηνιαία έσοδα δεν έχουν οριστεί.</span>{' '}
                <span className="text-amber-700">Προσθέστε τα στη σελίδα Πελάτες για να βλέπετε κέρδη και ROI.</span>
              </div>
              <Link href={`/${lang}/dashboard/clients`} className="ml-auto shrink-0 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-200">
                Πελάτες →
              </Link>
            </div>
          )}

          {/* ── KPI grid ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat icon={Clock} label="Ώρες εργασίας" value={hrs(summary.hours)} sub={`${num(employees.length)} εργαζόμενοι`} />
            <Stat icon={Wallet} label="Κόστος μισθών" value={eur(summary.cost)} />
            <Stat icon={TrendingUp} label="Έσοδα" value={eur(summary.revenue)} tone={summary.revenue > 0 ? 'pos' : 'neutral'} />
            <Stat icon={CircleDollarSign} label="Κέρδος" value={eur(summary.profit)} tone={summary.profit >= 0 ? 'pos' : 'neg'} />
            <Stat
              icon={Activity}
              label="Αξιοποίηση"
              value={pct(summary.utilization)}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          {/* ── Charts row ──────────────────────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <SectionHead
                title="Ώρες ανά πελάτη"
                sub="Top 6 · τρέχουσα περίοδος"
                action={
                  <Link href={`/${lang}/dashboard/clients`} className="flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:underline">
                    Όλοι <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
              <div className="mt-5 space-y-4">
                {topClients.map((c) => (
                  <div key={c.id}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <Link
                        href={`/${lang}/dashboard/clients/${c.id}`}
                        className="truncate pr-3 text-sm font-medium text-slate-700 hover:text-blue-600"
                      >
                        {c.name}
                      </Link>
                      <span className="shrink-0 text-xs tabular-nums text-slate-500">{hrs(c.hours)}</span>
                    </div>
                    <ProgressBar value={(c.hours / maxHours) * 100} />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex flex-col p-5">
              <SectionHead title="Χρεώσιμες vs Overhead" />
              <div className="flex flex-1 flex-col items-center justify-center pt-2">
                <Donut
                  className="w-36"
                  centerLabel={num(summary.billableHours + summary.nonBillableHours)}
                  centerSub="ώρες"
                  segments={[
                    { value: summary.billableHours, color: '#2563EB' },
                    { value: summary.nonBillableHours || 0.0001, color: '#f59e0b' },
                  ]}
                />
                <div className="mt-5 flex gap-5 text-xs">
                  <Legend color="#2563EB" label="Χρεώσιμες" value={hrs(summary.billableHours)} />
                  <Legend color="#f59e0b" label="Overhead" value={hrs(summary.nonBillableHours)} />
                </div>
              </div>
            </Card>
          </div>

          {/* ── Clients table ───────────────────────────────────── */}
          <OverviewClientsTable clients={clients} lang={lang} />

          {/* ── Employees grid ──────────────────────────────────── */}
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Εργαζόμενοι</h2>
              <Link href={`/${lang}/dashboard/employees`} className="flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:underline">
                Διαχείριση <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-2.5 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {employees.map((e) => (
                <EmployeeCard key={e.name} name={e.name} hours={e.hours} cost={e.cost} clientCount={e.clients.length} />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

/* ── Sub-components ────────────────────────────────────────────── */

const STAT_COLORS: Record<string, string> = {
  pos: 'text-emerald-600',
  neg: 'text-red-500',
  neutral: 'text-stone-900',
}

const ICON_BG: Record<string, string> = {
  pos: 'bg-emerald-50 text-emerald-600',
  neg: 'bg-red-50 text-red-500',
  neutral: 'bg-blue-50 text-blue-600',
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
  sub,
  className,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone?: 'pos' | 'neg' | 'neutral'
  sub?: string
  className?: string
}) {
  return (
    <Card className={`p-4 sm:p-5 ${className ?? ''}`}>
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${ICON_BG[tone]}`}>
        <Icon className="h-4.5 w-4.5" strokeWidth={2} size={18} />
      </span>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">{label}</p>
      <p className={`font-display mt-1 text-2xl font-bold tabular-nums tracking-tight ${STAT_COLORS[tone]}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-stone-400">{sub}</p>}
    </Card>
  )
}

function SectionHead({
  title,
  sub,
  action,
}: {
  title: string
  sub?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-500">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
      <span className="font-semibold text-slate-700">{value}</span>
    </span>
  )
}

const AVATAR_COLORS = ['#2563EB', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2']

function EmployeeCard({
  name,
  hours,
  cost,
  clientCount,
}: {
  name: string
  hours: number
  cost: number
  clientCount: number
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-blue-200 hover:bg-blue-50/30">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ background: color }}
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
          <span>{hrs(hours)}</span>
          <span className="text-slate-300">·</span>
          <span>{eur(cost)}</span>
          <span className="text-slate-300">·</span>
          <span>{clientCount} πελάτες</span>
        </div>
      </div>
    </div>
  )
}
