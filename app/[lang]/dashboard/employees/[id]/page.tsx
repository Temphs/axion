import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Clock, CircleDollarSign, Gauge, Hourglass, TrendingUp, Wallet } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { Donut, ProgressBar } from '@/components/axion/charts'
import { MonthlyHoursChart } from '@/components/dashboard/MonthlyHoursChart'
import { EmployeeClientsTable } from '@/components/dashboard/EmployeeClientsTable'
import { EmployeeEditPanel } from '@/components/dashboard/EmployeeEditPanel'
import { EmployeeAccessLink } from '@/components/dashboard/EmployeeAccessLink'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { KpiCard } from '@/components/workforce/KpiCard'
import { TargetsCard } from '@/components/workforce/TargetsCard'
import { getCurrentUser } from '@/lib/auth'
import { getEmployeeDetail } from '@/lib/stats'
import { buildWorkforce } from '@/lib/workforce'
import { eur, hrs, num, pct } from '@/lib/format'

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: PageProps<'/[lang]/dashboard/employees/[id]'>) {
  const { lang, id } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/${lang}/login`)
  const sp = await searchParams
  const from = typeof sp.from === 'string' && sp.from ? new Date(sp.from) : undefined
  const to = typeof sp.to === 'string' && sp.to ? new Date(`${sp.to}T23:59:59.999Z`) : undefined
  const all = sp.range === 'all'

  const [d, wf] = await Promise.all([
    getEmployeeDetail(user.id, id),
    buildWorkforce(user.id, { from, to, all }),
  ])
  if (!d) notFound()
  const row = wf.employees.find((e) => e.id === id)

  const topTypes = d.workTypes.slice(0, 6)
  const months = Math.max(wf.period.months, 0.01)
  const periodLabel = new Intl.DateTimeFormat('el-GR', { month: 'long', year: 'numeric' }).format(
    new Date(wf.period.from)
  )

  return (
    <div className="space-y-6">
      <Link href={`/${lang}/dashboard/employees`} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-200 transition hover:text-white">
        <ArrowLeft size={16} /> Εργαζόμενοι
      </Link>

      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 text-2xl font-bold text-white">
            {d.name.trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-white">{d.name}</h1>
            <p className="text-sm text-blue-200/90">
              {d.notes || 'Εργαζόμενος'} · {eur(d.monthlyCost)}/μήνα · {eur(d.costPerHour, true)}/ώρα
              {!d.active && <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-blue-50">Ανενεργός</span>}
            </p>
          </div>
        </div>
        <EmployeeEditPanel lang={lang} id={d.id} name={d.name} monthlyCost={d.monthlyCost} notes={d.notes} active={d.active} />
      </div>

      {/* Outside the "no entries yet" branch on purpose: a brand-new employee
          is exactly who needs the link. */}
      <EmployeeAccessLink lang={lang} employeeId={d.id} employeeName={d.name} token={d.accessToken} />

      {d.entryCount === 0 ? (
        <Card className="p-10 text-center text-slate-500">Δεν υπάρχουν ακόμη καταχωρήσεις για αυτόν τον εργαζόμενο.</Card>
      ) : (
        <>
          {/* ── Profitability, selected period ──────────────────── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-lg font-semibold text-white">
              Κερδοφορία{' '}
              <span className="font-normal text-blue-200/70">
                · {all ? 'όλο το ιστορικό' : from || to ? 'επιλεγμένη περίοδος' : periodLabel}
              </span>
            </h2>
            <DateRangeFilter />
          </div>
          {row && (
            <section className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <KpiCard
                  icon={Hourglass}
                  label="Ώρες"
                  value={hrs(row.hours)}
                  sub={`${hrs(row.billableHours)} χρεώσιμες${row.activeDays > 0 ? ` · μ.ο. ${hrs(row.hours / row.activeDays)}/ημέρα` : ''}`}
                  tooltip="Σύνολο καταχωρημένων ωρών στην περίοδο. Ο μέσος όρος ανά ημέρα μετρά μόνο ημέρες με καταχωρήσεις."
                />
                <KpiCard
                  icon={Gauge}
                  label="Χρεώσιμες ώρες"
                  value={pct(row.billableShare)}
                  sub={`${hrs(row.billableHours)} από ${hrs(row.hours)}`}
                  tooltip="Ποσοστό των ωρών που δουλεύτηκαν για χρεώσιμους πελάτες."
                />
                <KpiCard
                  icon={TrendingUp}
                  label="Έσοδα"
                  value={eur(row.revenue)}
                  tooltip="Έσοδα πελατών επιμερισμένα αναλογικά με τις ώρες του εργαζόμενου ανά πελάτη και μήνα."
                />
                <KpiCard
                  icon={Wallet}
                  label="Κόστος εργασίας"
                  value={eur(row.laborCost)}
                  tooltip="Ώρες × πλήρες ωριαίο κόστος."
                />
                <KpiCard
                  icon={CircleDollarSign}
                  label="Συνεισφορά"
                  value={eur(row.contribution)}
                  tone={row.contribution >= 0 ? 'pos' : 'neg'}
                  sub={row.margin !== null ? `περιθώριο ${pct(row.margin)}` : undefined}
                  tooltip="Επιμερισμένα έσοδα − κόστος εργασίας."
                />
                <KpiCard
                  icon={Clock}
                  label="€ / χρεώσιμη ώρα"
                  value={row.revenuePerHour !== null ? eur(row.revenuePerHour, true) : '—'}
                  sub={row.unbilledHours > 0 ? `${hrs(row.unbilledHours)} μη τιμολογημένες` : undefined}
                  tooltip="Επιμερισμένα έσοδα ÷ χρεώσιμες ώρες."
                />
              </div>

              <TargetsCard
                employeeId={d.id}
                targets={row.targets}
                actuals={{
                  billableShare: row.billableShare,
                  monthlyHours: row.hours / months,
                  monthlyContribution: row.contribution / months,
                }}
              />
            </section>
          )}

          {/* ── All-time activity ───────────────────────────────── */}
          {/* The KPI row that used to sit here repeated the period cards above
              (same hours, same cost) and showed a second, differently-defined
              "Αξιοποίηση" next to the first one. One reading per number. */}
          <h2 className="font-display text-lg font-semibold text-white">
            Συνολική δραστηριότητα{' '}
            <span className="font-normal text-blue-200/70">
              · {num(d.days)} ημέρες με καταχωρήσεις · μ.ό. {hrs(d.avgPerDay)}/ημέρα
            </span>
          </h2>

          {/* trend + billable split */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="mb-1 text-sm font-semibold text-slate-900">Ώρες ανά μήνα</h2>
              <p className="mb-3 text-xs text-slate-400">
                {d.trend.length ? `${d.trend[0].label} → ${d.trend[d.trend.length - 1].label}` : '—'}
              </p>
              <MonthlyHoursChart data={d.trend} />
            </Card>

            <Card className="flex flex-col items-center p-5">
              <h2 className="mb-3 self-start text-sm font-semibold text-slate-900">Χρεώσιμες vs Overhead</h2>
              {d.hours > 0 ? (
                <Donut
                  className="w-36"
                  immediate
                  centerLabel={pct(d.billablePct)}
                  centerSub="χρεώσιμες"
                  segments={[
                    { value: d.billableHours, color: '#2563EB' },
                    { value: d.nonBillableHours || 0.0001, color: '#f59e0b' },
                  ]}
                />
              ) : null}
              <div className="mt-4 flex gap-4 text-xs">
                <Legend color="#2563EB" label="Χρεώσιμες" value={hrs(d.billableHours)} />
                <Legend color="#f59e0b" label="Overhead" value={hrs(d.nonBillableHours)} />
              </div>
            </Card>
          </div>

          {/* work-type mix */}
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-slate-900">Τι δουλειά κάνει</h2>
            <p className="mb-4 text-xs text-slate-400">Κατανομή ωρών ανά είδος εργασίας</p>
            <div className="space-y-3">
              {topTypes.map((t) => (
                <div key={t.type}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate pr-2 text-slate-700">{t.type}</span>
                    <span className="shrink-0 text-slate-500">
                      {hrs(t.hours)} <span className="text-slate-400">({pct(t.pct)})</span>
                    </span>
                  </div>
                  <ProgressBar value={t.pct * 100} immediate />
                </div>
              ))}
            </div>
          </Card>

          {/* employee → client breakdown for the period */}
          {row && <EmployeeClientsTable clients={row.clients} lang={lang} />}
        </>
      )}
    </div>
  )
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-500">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label} <span className="font-medium text-slate-700">{value}</span>
    </span>
  )
}
