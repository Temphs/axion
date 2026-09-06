import Link from 'next/link'
import { Gauge, Target } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { Donut, ProgressBar } from '@/components/axion/charts'
import { eur, hrs, pct } from '@/lib/format'
import type { ClientRow, EmployeeRow } from '@/lib/profitability'

// Employee overview: a ranked profitability list beside a revenue-by-client
// donut and two headline ratios.

const AVATAR_COLORS = ['#2563EB', '#4f46e5', '#0891b2', '#7c3aed', '#0d9488', '#2563EB']
const DONUT_COLORS = ['#1d4ed8', '#2563EB', '#3b82f6', '#60a5fa', '#93c5fd', '#c7d2fe']

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}

// Bars stay on the brand blue so the list reads as one block; the performance
// table below is where utilization gets its red/amber/green judgement.
function barColor(value: number | null): string {
  return value === null ? '#cbd5e1' : '#2563EB'
}

export function EmployeeProfitabilityPanel({
  employees,
  clients,
  periodLabel,
  lang,
}: {
  employees: EmployeeRow[]
  clients: ClientRow[]
  periodLabel: string
  lang: string
}) {
  const ranked = [...employees]
    .filter((e) => e.hours > 0)
    .sort((a, b) => (b.utilization ?? -1) - (a.utilization ?? -1) || b.hours - a.hours)
    .slice(0, 6)

  const byRevenue = clients
    .filter((c) => c.billable && c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
  const totalRevenue = byRevenue.reduce((s, c) => s + c.revenue, 0)

  const totals = employees.reduce(
    (s, e) => {
      s.hours += e.hours
      s.billable += e.billableHours
      s.contribution += e.contribution
      return s
    },
    { hours: 0, billable: 0, contribution: 0 }
  )
  const marginPerHour = totals.hours > 0 ? totals.contribution / totals.hours : null
  const billableRate = totals.hours > 0 ? totals.billable / totals.hours : null

  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      {/* ── Ranked employees ──────────────────────────────────── */}
      <Card className="p-5 lg:col-span-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold tracking-tight text-slate-900">
              Κερδοφορία εργαζομένων
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">{periodLabel} · όλοι οι πελάτες</p>
          </div>
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
        </div>

        <ul className="mt-5 space-y-4">
          {ranked.map((e, i) => (
            <li key={e.id}>
              <Link href={`/${lang}/dashboard/employees/${e.id}`} className="group block">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {initials(e.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900 transition group-hover:text-blue-600">
                      {e.name}
                    </span>
                    <span className="block truncate text-xs text-slate-400">
                      {hrs(e.hours)} · κόστος {eur(e.costPerHour)}/ώρα
                      {e.revenuePerHour !== null && ` · έσοδα ${eur(e.revenuePerHour)}/ώρα`}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                    {pct(e.utilization)}
                  </span>
                </div>
                <div className="mt-2 pl-12">
                  <ProgressBar
                    value={e.utilization !== null ? Math.min(100, e.utilization * 100) : 0}
                    color={barColor(e.utilization)}
                    immediate
                  />
                </div>
              </Link>
            </li>
          ))}
          {ranked.length === 0 && (
            <li className="py-8 text-center text-xs text-slate-400">Καμία καταχώρηση στην περίοδο</li>
          )}
        </ul>
      </Card>

      {/* ── Revenue mix + headline ratios ─────────────────────── */}
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-base font-bold tracking-tight text-slate-900">
              Έσοδα ανά πελάτη
            </h2>
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          </div>

          {totalRevenue > 0 ? (
            <>
              <Donut
                className="mx-auto mt-4 max-w-[168px]"
                segments={byRevenue.map((c, i) => ({
                  value: c.revenue,
                  color: DONUT_COLORS[i % DONUT_COLORS.length],
                }))}
                centerLabel={eur(totalRevenue)}
                centerSub={periodLabel}
                immediate
              />
              <ul className="mt-4 space-y-1.5">
                {byRevenue.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    />
                    <span className="min-w-0 flex-1 truncate text-slate-600">{c.name}</span>
                    <span className="shrink-0 tabular-nums text-slate-400">
                      {pct(c.revenue / totalRevenue)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="py-10 text-center text-xs text-slate-400">
              Ορίστε μηνιαία έσοδα στους πελάτες για να εμφανιστεί η κατανομή.
            </p>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <MiniStat
            icon={<Target size={14} strokeWidth={2.25} />}
            value={marginPerHour !== null ? eur(marginPerHour) : '—'}
            label="μ.ό. περιθώριο / ώρα"
          />
          <MiniStat
            icon={<Gauge size={14} strokeWidth={2.25} />}
            value={pct(billableRate)}
            label="χρεώσιμες ώρες"
          />
        </div>
      </div>
    </div>
  )
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <Card className="p-4">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_3px_8px_-2px_rgba(37,99,235,0.55)]">
        {icon}
      </span>
      <p className="font-display mt-3 text-lg font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{label}</p>
    </Card>
  )
}
