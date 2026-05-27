import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock, CalendarDays, Hourglass, Gauge, Wallet } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { Donut, ProgressBar } from '@/components/axion/charts'
import { MonthlyHoursChart } from '@/components/dashboard/MonthlyHoursChart'
import { EmployeeClientsTable } from '@/components/dashboard/EmployeeClientsTable'
import { EmployeeEditPanel } from '@/components/dashboard/EmployeeEditPanel'
import { getEmployeeDetail } from '@/lib/stats'
import { getSettings, hoursPerMonth } from '@/lib/settings'
import { eur, hrs, num, pct } from '@/lib/format'

export default async function EmployeeDetailPage({ params }: PageProps<'/[lang]/dashboard/employees/[id]'>) {
  const { lang, id } = await params
  const [d, settings] = await Promise.all([getEmployeeDetail(id), getSettings()])
  if (!d) notFound()

  const hpm = hoursPerMonth(settings)
  const topTypes = d.workTypes.slice(0, 6)

  return (
    <div className="space-y-6">
      <Link href={`/${lang}/dashboard/employees`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600">
        <ArrowLeft size={16} /> Εργαζόμενοι
      </Link>

      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 text-2xl font-bold text-white">
            {d.name.trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-900">{d.name}</h1>
            <p className="text-sm text-slate-500">
              {d.notes || 'Εργαζόμενος'} · {eur(d.monthlyCost)}/μήνα · {eur(d.costPerHour, true)}/ώρα
              {!d.active && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Ανενεργός</span>}
            </p>
          </div>
        </div>
        <EmployeeEditPanel lang={lang} id={d.id} name={d.name} monthlyCost={d.monthlyCost} notes={d.notes} active={d.active} />
      </div>

      {d.entryCount === 0 ? (
        <Card className="p-10 text-center text-slate-500">Δεν υπάρχουν ακόμη καταχωρήσεις για αυτόν τον εργαζόμενο.</Card>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi icon={<Clock size={16} />} label="Ώρες / ημέρα" value={hrs(d.avgPerDay)} sub={`από ${settings.hoursPerDay}ω`} />
            <Kpi icon={<CalendarDays size={16} />} label="Ώρες / μήνα" value={hrs(d.avgPerMonth)} sub={`από ${num(hpm)}ω`} />
            <Kpi icon={<Hourglass size={16} />} label="Σύνολο ωρών" value={hrs(d.hours)} sub={`${d.days} ημέρες`} />
            <Kpi icon={<Gauge size={16} />} label="Αξιοποίηση" value={pct(d.utilization)} tone={utilTone(d.utilization)} />
            <Kpi icon={<Wallet size={16} />} label="Κόστος" value={eur(d.cost)} sub={`${d.entryCount} εγγραφές`} />
          </div>

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
                  <ProgressBar value={t.pct * 100} />
                </div>
              ))}
            </div>
          </Card>

          {/* clients (searchable) */}
          <EmployeeClientsTable clients={d.clients} lang={lang} />
        </>
      )}
    </div>
  )
}

function utilTone(u: number | null): 'pos' | 'neg' | undefined {
  if (u === null) return undefined
  if (u >= 0.8) return 'pos'
  if (u < 0.5) return 'neg'
  return undefined
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: 'pos' | 'neg' }) {
  return (
    <Card className="p-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-blue-600">{icon}</span>
      </div>
      <p className={'font-display text-2xl font-semibold tracking-tight tabular-nums ' + (tone === 'pos' ? 'text-emerald-600' : tone === 'neg' ? 'text-amber-600' : 'text-stone-900')}>{value}</p>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
    </Card>
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
