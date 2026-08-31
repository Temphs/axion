import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, CircleDollarSign, Gauge, Hourglass, Timer, TrendingUp, Wallet } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { ProgressBar } from '@/components/axion/charts'
import { MonthlyHoursChart } from '@/components/dashboard/MonthlyHoursChart'
import { ClientEditPanel } from '@/components/dashboard/ClientEditPanel'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { KpiCard } from '@/components/workforce/KpiCard'
import { getCurrentUser } from '@/lib/auth'
import { getClientDetail } from '@/lib/stats'
import { buildWorkforce } from '@/lib/workforce'
import { eur, hrs, num, pct } from '@/lib/format'
import type { ClientHealth } from '@/lib/profitability'

const HEALTH_BADGE: Record<ClientHealth, { label: string; cls: string }> = {
  healthy: { label: 'Υγιής', cls: 'bg-emerald-50 text-emerald-700' },
  watch: { label: 'Παρακολούθηση', cls: 'bg-amber-50 text-amber-700' },
  critical: { label: 'Κρίσιμος', cls: 'bg-red-50 text-red-600' },
  overhead: { label: 'Overhead', cls: 'bg-slate-100 text-slate-500' },
}

export default async function ClientDetailPage({ params, searchParams }: PageProps<'/[lang]/dashboard/clients/[id]'>) {
  const { lang, id } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/${lang}/login`)

  const sp = await searchParams
  const from = typeof sp.from === 'string' && sp.from ? new Date(sp.from) : undefined
  const to = typeof sp.to === 'string' && sp.to ? new Date(`${sp.to}T23:59:59.999Z`) : undefined
  const all = sp.range === 'all'
  const hasRange = !!(from || to || all)

  const [d, wf] = await Promise.all([
    getClientDetail(user.id, id),
    buildWorkforce(user.id, { from, to, all }),
  ])
  if (!d) notFound()
  const row = wf.clients.find((c) => c.id === id)

  const topTypes = d.workTypes.slice(0, 8)
  const monthLabel = new Intl.DateTimeFormat('el-GR', { month: 'long', year: 'numeric' }).format(new Date(wf.period.from))
  const periodLabel = all ? 'όλο το ιστορικό' : hasRange ? 'επιλεγμένη περίοδος' : monthLabel

  return (
    <div className="space-y-6">
      <Link href={`/${lang}/dashboard/clients`} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-200 transition hover:text-white">
        <ArrowLeft size={16} /> Πελάτες
      </Link>

      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-500 text-2xl font-bold text-white">
            {d.name.trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-white">{d.name}</h1>
            <p className="flex flex-wrap items-center gap-2 text-sm text-blue-200/90">
              <span className={'rounded-full px-2 py-0.5 text-[11px] font-medium ' + (d.billable ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700')}>
                {d.billable ? 'Χρεώσιμος' : 'Overhead'}
              </span>
              {row && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${HEALTH_BADGE[row.health].cls}`}>
                  {HEALTH_BADGE[row.health].label}
                </span>
              )}
              {d.billable && <span>{eur(d.monthlyRevenue)}/μήνα έσοδο</span>}
              {d.notes && <span className="text-blue-200/70">{d.notes}</span>}
              {!d.active && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-blue-50">Ανενεργός</span>}
            </p>
          </div>
        </div>
        <ClientEditPanel
          lang={lang}
          id={d.id}
          name={d.name}
          billable={d.billable}
          monthlyRevenue={d.monthlyRevenue}
          plannedMonthlyHours={row?.plannedMonthlyHours ?? null}
          notes={d.notes}
          active={d.active}
        />
      </div>

      {d.entryCount === 0 ? (
        <Card className="p-10 text-center text-slate-500">Δεν υπάρχουν ακόμη καταχωρήσεις για αυτόν τον πελάτη.</Card>
      ) : (
        <>
          {/* ── Profitability for the selected period ───────────── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-lg font-semibold text-white">
              Κερδοφορία <span className="font-normal text-blue-200/70">· {periodLabel}</span>
            </h2>
            <DateRangeFilter />
          </div>
          {row ? (
            <section className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {/* The monthly averages that used to sit in a second card row
                    ride along as the grey sub-line of the number they belong
                    to, so the page carries one row instead of two. */}
                <KpiCard
                  icon={TrendingUp}
                  label="Έσοδα περιόδου"
                  value={row.billable ? eur(row.revenue) : '—'}
                  sub={d.billable ? `μ.ό. ${eur(d.monthlyRevenue)}/μήνα` : undefined}
                  tooltip="Μηνιαίο έσοδο, αναλογικά για την περίοδο (μόνο μήνες με δραστηριότητα)."
                />
                <KpiCard
                  icon={Hourglass}
                  label="Ώρες ομάδας"
                  value={hrs(row.hours)}
                  sub={`${row.employees.length} εργαζόμενοι · μ.ό. ${hrs(d.avgPerMonth)}/μήνα`}
                />
                <KpiCard
                  icon={Wallet}
                  label="Κόστος εργασίας"
                  value={eur(row.laborCost)}
                  sub={`μ.ό. ${eur(d.avgMonthlyCost)}/μήνα`}
                  tooltip="Ώρες κάθε εργαζόμενου × το ωριαίο κόστος του."
                />
                <KpiCard
                  icon={CircleDollarSign}
                  label="Συνεισφορά"
                  value={row.billable ? eur(row.contribution) : '—'}
                  tone={row.contribution >= 0 ? 'pos' : 'neg'}
                  sub={[
                    row.margin !== null ? `περιθώριο ${pct(row.margin)}` : null,
                    d.billable ? `μ.ό. ${eur(d.profitPerMonth)}/μήνα` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  tooltip="Έσοδα − κόστος εργασίας."
                />
                <KpiCard
                  icon={Gauge}
                  label="€ / ώρα"
                  value={row.revenuePerHour !== null ? eur(row.revenuePerHour, true) : '—'}
                  sub={
                    wf.companyRevenuePerHour !== null ? `μ.ό. εταιρείας ${eur(wf.companyRevenuePerHour, true)}` : undefined
                  }
                  tooltip="Έσοδα ÷ ώρες εργαζομένων στον πελάτη — συγκρίνετε με τον μέσο όρο της εταιρείας."
                />
                <KpiCard
                  icon={Timer}
                  label="Προγρ. vs πραγματικές"
                  value={
                    row.plannedHours !== null ? `${num(row.hours)} / ${num(row.plannedHours)}ω` : '—'
                  }
                  sub={
                    row.hoursVariance !== null && row.plannedHours !== null && row.plannedHours > 0
                      ? `${row.hoursVariance >= 0 ? '+' : ''}${num(row.hoursVariance)}ω (${row.hoursVariance >= 0 ? '+' : ''}${Math.round((row.hoursVariance / row.plannedHours) * 100)}%)`
                      : 'Ορίστε προγραμματισμένες ώρες στην επεξεργασία'
                  }
                  tone={row.budgetConsumed !== null && row.budgetConsumed > 1 ? 'neg' : 'neutral'}
                  tooltip="Πραγματικές έναντι προγραμματισμένων ωρών περιόδου. Χρησιμοποιείται και για ειδοποιήσεις υπέρβασης."
                />
              </div>

              {row.budgetConsumed !== null && (
                <Card className="p-4">
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">Κατανάλωση προγραμματισμένων ωρών</span>
                    <span className={`tabular-nums text-xs font-semibold ${row.budgetConsumed > 1 ? 'text-red-500' : 'text-slate-500'}`}>
                      {pct(row.budgetConsumed)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${row.budgetConsumed > 1 ? 'bg-red-500' : row.budgetConsumed > 0.85 ? 'bg-amber-500' : 'bg-blue-600'}`}
                      style={{ width: `${Math.min(100, row.budgetConsumed * 100)}%` }}
                    />
                  </div>
                </Card>
              )}
            </section>
          ) : (
            // Nothing in the period, so the cards above never rendered: the
            // historical averages they normally carry are stated here instead.
            <div className="rounded-2xl border border-amber-300/30 bg-amber-400/15 px-4 py-3 text-sm text-amber-100">
              <p className="font-medium">Χωρίς δραστηριότητα στην περίοδο — τα παρακάτω αφορούν το ιστορικό του πελάτη.</p>
              <p className="mt-1 text-xs text-amber-100/80">
                {hrs(d.hours)} συνολικά · μ.ό. {hrs(d.avgPerMonth)}/μήνα · κόστος {eur(d.avgMonthlyCost)}/μήνα
                {d.billable && ` · έσοδα ${eur(d.monthlyRevenue)}/μήνα · καθαρό ${eur(d.profitPerMonth)}/μήνα`}
              </p>
            </div>
          )}

          {/* monthly hours trend */}
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-slate-900">Ώρες ανά μήνα</h2>
            <p className="mb-3 text-xs text-slate-400">
              {d.trend.length ? `${d.trend[0].label} → ${d.trend[d.trend.length - 1].label}` : '—'}
              {' · '}
              {num(d.months)} μήνες · {num(d.entryCount)} εγγραφές
            </p>
            <MonthlyHoursChart data={d.trend} />
          </Card>

          {/* What work is done here comes before who did it: the owner reads
              the type of work first, then whose time it consumed. */}
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-slate-900">Τι εργασίες γίνονται συνήθως</h2>
            <p className="mb-4 text-xs text-slate-400">Κατανομή ωρών ανά είδος εργασίας</p>
            <div className="space-y-3">
              {topTypes.map((t) => (
                <div key={t.type}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate pr-2 text-slate-700">{t.type}</span>
                    <span className="shrink-0 text-slate-500">{hrs(t.hours)} <span className="text-slate-400">({pct(t.pct)})</span></span>
                  </div>
                  <ProgressBar value={t.pct * 100} immediate />
                </div>
              ))}
            </div>
          </Card>

          {/* employees who worked on this client */}
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Ποιοι εργαζόμενοι δούλεψαν εδώ</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-medium">Εργαζόμενος</th>
                    <th className="px-5 py-3 font-medium">Μερίδιο</th>
                    <th className="px-5 py-3 text-right font-medium">Ώρες</th>
                    <th className="px-5 py-3 text-right font-medium">Κόστος</th>
                  </tr>
                </thead>
                <tbody>
                  {d.employees.map((e) => (
                    <tr key={e.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                      <td className="px-5 py-3 text-slate-800">
                        <Link href={`/${lang}/dashboard/employees/${e.id}`} className="font-medium text-blue-600 hover:underline">{e.name}</Link>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-28"><ProgressBar value={e.pct * 100} immediate /></div>
                          <span className="text-xs text-slate-500">{pct(e.pct)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-600">{hrs(e.hours)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-600">{eur(e.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </>
      )}
    </div>
  )
}

