import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock, Hourglass, Wallet, Coins, TrendingUp } from 'lucide-react'
import { Card } from '@/components/axion/ui'
import { ProgressBar } from '@/components/axion/charts'
import { MonthlyHoursChart } from '@/components/dashboard/MonthlyHoursChart'
import { ClientEditPanel } from '@/components/dashboard/ClientEditPanel'
import { getClientDetail } from '@/lib/stats'
import { eur, hrs, num, pct } from '@/lib/format'

export default async function ClientDetailPage({ params }: PageProps<'/[lang]/dashboard/clients/[id]'>) {
  const { lang, id } = await params
  const d = await getClientDetail(id)
  if (!d) notFound()

  const topTypes = d.workTypes.slice(0, 8)

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
            <p className="text-sm text-blue-200/90">
              <span className={'rounded-full px-2 py-0.5 text-[11px] font-medium ' + (d.billable ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700')}>
                {d.billable ? 'Χρεώσιμος' : 'Overhead'}
              </span>
              {d.billable && <span className="ml-2">{eur(d.monthlyRevenue)}/μήνα έσοδο</span>}
              {d.notes && <span className="ml-2 text-blue-200/70">{d.notes}</span>}
              {!d.active && <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-blue-50">Ανενεργός</span>}
            </p>
          </div>
        </div>
        <ClientEditPanel lang={lang} id={d.id} name={d.name} billable={d.billable} monthlyRevenue={d.monthlyRevenue} notes={d.notes} active={d.active} />
      </div>

      {d.entryCount === 0 ? (
        <Card className="p-10 text-center text-slate-500">Δεν υπάρχουν ακόμη καταχωρήσεις για αυτόν τον πελάτη.</Card>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi icon={<Clock size={16} />} label="Ώρες / μήνα" value={hrs(d.avgPerMonth)} sub={`${num(d.months)} μήνες`} />
            <Kpi icon={<Hourglass size={16} />} label="Σύνολο ωρών" value={hrs(d.hours)} sub={`${d.entryCount} εγγραφές`} />
            <Kpi icon={<Coins size={16} />} label="Κόστος μισθών / μήνα" value={eur(d.avgMonthlyCost)} />
            <Kpi icon={<Wallet size={16} />} label="Έσοδα / μήνα" value={d.billable ? eur(d.monthlyRevenue) : '—'} />
            <Kpi icon={<TrendingUp size={16} />} label="Καθαρό κέρδος / μήνα" value={d.billable ? eur(d.profitPerMonth) : '—'} tone={!d.billable ? undefined : d.profitPerMonth >= 0 ? 'pos' : 'neg'} />
          </div>

          {/* monthly trend */}
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-slate-900">Ώρες ανά μήνα</h2>
            <p className="mb-3 text-xs text-slate-400">{d.trend.length ? `${d.trend[0].label} → ${d.trend[d.trend.length - 1].label}` : '—'}</p>
            <MonthlyHoursChart data={d.trend} />
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
                          <div className="w-28"><ProgressBar value={e.pct * 100} /></div>
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

          {/* what tasks */}
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
                  <ProgressBar value={t.pct * 100} />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: 'pos' | 'neg' }) {
  return (
    <Card className="p-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-blue-600">{icon}</span>
      </div>
      <p className={'font-display text-2xl font-semibold tracking-tight tabular-nums ' + (tone === 'pos' ? 'text-emerald-600' : tone === 'neg' ? 'text-red-500' : 'text-stone-900')}>{value}</p>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
    </Card>
  )
}
