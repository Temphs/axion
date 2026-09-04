import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity, Briefcase, ChevronRight, CircleDollarSign, Clock, Info, TrendingUp, Users, Wallet } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { ProgressBar } from '@/components/axion/charts'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { KpiCard } from '@/components/workforce/KpiCard'
import { HoursOverviewCard } from '@/components/workforce/HoursOverviewCard'
import { ProfitTrendChart } from '@/components/workforce/ProfitTrendChart'
import { AlertsPanel } from '@/components/workforce/AlertsPanel'
import { getCurrentUser } from '@/lib/auth'
import { buildWorkforce } from '@/lib/workforce'
import { parseStatsFilter, getSidebarSummary } from '@/lib/stats'
import { eur, hrs, num, pct } from '@/lib/format'

function delta(current: number, previous: number | undefined | null): number | null {
  if (previous === undefined || previous === null || previous === 0) return null
  return (current - previous) / Math.abs(previous)
}

// Overview: a calm general picture. The detailed tables live in the
// Employees and Clients pages.
export default async function DashboardOverview({ params, searchParams }: PageProps<'/[lang]/dashboard'>) {
  const { lang } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/${lang}/login`)
  const sp = await searchParams
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string') usp.set(k, v)
  const parsed = parseStatsFilter(usp)
  const filter = 'error' in parsed ? {} : parsed.filter
  const allRange = usp.get('range') === 'all'

  const [wf, allTime] = await Promise.all([
    buildWorkforce(user.id, { from: filter.from, to: filter.to, all: allRange }),
    getSidebarSummary(user.id),
  ])
  const { summary, previousSummary: prev } = wf
  const empty = summary.hours === 0 && wf.trend.every((t) => t.laborCost === 0 && t.revenue === 0)

  // Ranked by contribution so the ordering matches the bars beside them.
  const topClients = wf.clients
    .filter((c) => c.billable)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 5)
  // Every active employee shows up, even with zero hours in the period.
  const topEmployees = [...wf.employees]
    .filter((e) => e.active || e.hours > 0)
    .sort((a, b) => b.contribution - a.contribution || b.hours - a.hours)
    .slice(0, 5)

  const periodName = new Intl.DateTimeFormat('el-GR', { month: 'long', year: 'numeric' }).format(new Date(wf.period.from))
  const hasCustomRange = !!(filter.from || filter.to)
  const periodChip = wf.period.all
    ? `Όλο το ιστορικό · ${wf.period.months} μήνες με δεδομένα`
    : hasCustomRange
      ? 'Επιλεγμένη περίοδος'
      : `Αναλυτικά στοιχεία: ${periodName}`
  const avgPerDay = summary.activeDays > 0 ? summary.hours / summary.activeDays : null
  const maxClientContribution = Math.max(...topClients.map((c) => Math.max(0, c.contribution)), 1)
  const asPct = (fraction: number | null) => (fraction === null ? null : fraction * 100)
  const hoursDeltaPct = asPct(delta(summary.hours, prev?.hours))
  const contributionDeltaPct = asPct(delta(summary.contribution, prev?.contribution))

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-blue-200/70">
            <span>MyEmployee</span>
            <span aria-hidden className="text-blue-200/40">
              /
            </span>
            <span className="font-medium text-white/90">Επισκόπηση</span>
          </nav>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Επισκόπηση</h1>
          <p className="mt-0.5 text-sm text-blue-200/80">Η γενική εικόνα της επιχείρησης</p>
        </div>
        <DateRangeFilter />
      </header>

      {/* ── All-time business snapshot ─────────────────────────── */}
      <Card className="flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
        <Snapshot label="Σύνολο ωρών" value={hrs(allTime.hours)} />
        <Snapshot label="Συνολικό κόστος μισθών" value={eur(allTime.cost)} />
        <Snapshot label="Ενεργοί πελάτες" value={num(allTime.clientCount)} />
        <Snapshot label="Ενεργοί εργαζόμενοι" value={num(allTime.employeeCount)} />
        <span className="ml-auto rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{periodChip}</span>
      </Card>

      {empty ? (
        <Card className="p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <Activity className="h-7 w-7 text-blue-600" />
          </div>
          <p className="text-lg font-semibold text-slate-900">Δεν υπάρχουν καταχωρήσεις εργασίας στην περίοδο</p>
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
          {summary.revenue === 0 && summary.hours > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="text-sm">
                <span className="font-semibold text-amber-800">Τα μηνιαία έσοδα πελατών δεν έχουν οριστεί.</span>{' '}
                <span className="text-amber-700">Χωρίς αυτά δεν υπολογίζονται συνεισφορά και περιθώρια.</span>
              </div>
              <Link href={`/${lang}/dashboard/clients`} className="ml-auto shrink-0 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-200">
                Πελάτες →
              </Link>
            </div>
          )}

          {/* ── Four headline numbers ───────────────────────────── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={TrendingUp}
              label="Έσοδα"
              value={eur(summary.revenue)}
              sub={`${summary.clientCount} πελάτες με δραστηριότητα`}
              delta={delta(summary.revenue, prev?.revenue)}
              tooltip="Μηνιαία έσοδα πελατών, αναλογικά για την περίοδο — μόνο για μήνες με καταγεγραμμένη εργασία."
            />
            <KpiCard
              icon={Wallet}
              label="Κόστος εργασίας"
              value={eur(summary.laborCost)}
              sub={`${hrs(summary.hours)} εργασίας${avgPerDay !== null ? ` · μ.ο. ${hrs(avgPerDay)}/ημέρα` : ''}`}
              delta={delta(summary.laborCost, prev?.laborCost)}
              invert
              tooltip="Ώρες εργασίας × πλήρες ωριαίο κόστος κάθε εργαζόμενου."
            />
            <KpiCard
              icon={CircleDollarSign}
              label="Συνεισφορά"
              value={eur(summary.contribution)}
              tone={summary.contribution >= 0 ? 'pos' : 'neg'}
              sub={summary.margin !== null ? `περιθώριο ${pct(summary.margin)}` : undefined}
              delta={delta(summary.contribution, prev?.contribution)}
              tooltip="Έσοδα − κόστος εργασίας."
            />
            <KpiCard
              icon={Activity}
              label="Αξιοποίηση"
              value={pct(summary.utilization)}
              sub={summary.unbilledHours > 0 ? `${hrs(summary.unbilledHours)} μη τιμολογημένες` : 'όλες οι ώρες χρεώσιμες'}
              delta={
                summary.utilization !== null && prev?.utilization != null
                  ? summary.utilization - prev.utilization
                  : null
              }
              deltaSuffix=" μ.β."
              tooltip="Χρεώσιμες ώρες ÷ διαθέσιμες εργάσιμες ώρες της ομάδας. Η μεταβολή δίνεται σε μονάδες βάσης (ποσοστιαίες μονάδες)."
            />
          </div>

          {/* ── Charts ──────────────────────────────────────────── */}
          <div className="grid items-start gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <HoursOverviewCard
                data={wf.trend}
                caption="σε σχέση με την προηγούμενη περίοδο"
                deltaPct={hoursDeltaPct}
                stats={[
                  { icon: Clock, label: 'Ώρες', value: hrs(summary.hours) },
                  { icon: Activity, label: 'Χρεώσιμες', value: hrs(summary.billableHours) },
                  { icon: Briefcase, label: 'Πελάτες', value: num(summary.clientCount) },
                  { icon: Users, label: 'Εργαζόμενοι', value: num(summary.employeeCount) },
                ]}
              />
            </div>
            <Card className="p-5 lg:col-span-3">
              <h2 className="font-display text-base font-bold tracking-tight text-slate-900">Πορεία κερδοφορίας</h2>
              <p className="mb-4 mt-0.5 text-xs text-slate-400">
                {contributionDeltaPct !== null && (
                  <span className={`font-semibold ${contributionDeltaPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {contributionDeltaPct >= 0 ? '↑' : '↓'} {Math.abs(contributionDeltaPct).toFixed(0)}% συνεισφορά{' '}
                  </span>
                )}
                {wf.period.all ? 'σε μήνες με δραστηριότητα (έως 12)' : 'στους τελευταίους 6 μήνες'}
              </p>
              <ProfitTrendChart data={wf.trend} />
            </Card>
          </div>

          <AlertsPanel insights={wf.insights.slice(0, 4)} lang={lang} />

          {/* ── Top lists ───────────────────────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Κορυφαίοι πελάτες</h2>
                <Link href={`/${lang}/dashboard/clients`} className="flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:underline">
                  Αναλυτικά <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <ul className="space-y-3">
                {topClients.map((c) => (
                  <li key={c.id}>
                    <Link href={`/${lang}/dashboard/clients/${c.id}`} className="group block">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <HealthDot health={c.health} />
                          <span className="truncate text-sm font-medium text-slate-700 transition group-hover:text-blue-600">
                            {c.name}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3 tabular-nums">
                          <span className="text-xs text-slate-400">{hrs(c.hours)}</span>
                          <span className={`text-sm font-semibold ${c.contribution >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {eur(c.contribution)}
                          </span>
                        </span>
                      </div>
                      <ProgressBar
                        value={maxClientContribution > 0 ? (Math.max(0, c.contribution) / maxClientContribution) * 100 : 0}
                        color={c.contribution >= 0 ? '#2563EB' : '#ef4444'}
                        immediate
                      />
                    </Link>
                  </li>
                ))}
                {topClients.length === 0 && <li className="py-6 text-center text-xs text-slate-400">Καμία δραστηριότητα στην περίοδο</li>}
              </ul>
            </Card>

            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Εργαζόμενοι</h2>
                <Link href={`/${lang}/dashboard/employees`} className="flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:underline">
                  Αναλυτικά <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <ul className="space-y-3">
                {topEmployees.map((e) => (
                  <li key={e.id}>
                    <Link href={`/${lang}/dashboard/employees/${e.id}`} className="group block">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <Avatar name={e.name} />
                          <span className="truncate text-sm font-medium text-slate-700 transition group-hover:text-blue-600">
                            {e.name}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3 tabular-nums">
                          <span className="text-xs text-slate-400">{hrs(e.hours)}</span>
                          <span className={`text-sm font-semibold ${e.contribution >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {eur(e.contribution)}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <ProgressBar
                            value={e.utilization !== null ? Math.min(100, e.utilization * 100) : 0}
                            color={utilColor(e.utilization, e.targets.utilizationPct)}
                            immediate
                          />
                        </div>
                        <span className="w-11 shrink-0 text-right text-[11px] tabular-nums text-slate-400">
                          {pct(e.utilization)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
                {topEmployees.length === 0 && <li className="py-6 text-center text-xs text-slate-400">Καμία δραστηριότητα στην περίοδο</li>}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

// Utilization bar colour: green at/above target, blue when close, amber below.
function utilColor(utilization: number | null, targetPct: number | null): string {
  if (utilization === null) return '#cbd5e1'
  const target = (targetPct ?? 75) / 100
  if (utilization >= target) return '#10b981'
  if (utilization >= target * 0.8) return '#2563EB'
  return '#f59e0b'
}

const AVATAR_COLORS = ['#2563EB', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2']

function Avatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ background: AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] }}
    >
      {initials}
    </span>
  )
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="font-display text-lg font-semibold tabular-nums tracking-tight text-slate-900">{value}</span>
    </span>
  )
}

function HealthDot({ health }: { health: string }) {
  const color =
    health === 'healthy' ? 'bg-emerald-500' : health === 'watch' ? 'bg-amber-400' : health === 'critical' ? 'bg-red-500' : 'bg-slate-300'
  return <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
}
