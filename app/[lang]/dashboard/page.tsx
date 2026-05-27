import Link from 'next/link'
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
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Επισκόπηση</h1>
          <p className="text-sm text-slate-500">Παραγωγικότητα & κερδοφορία ανά πελάτη και εργαζόμενο</p>
        </div>
        <DateRangeFilter />
      </header>

      {empty ? (
        <Card className="p-10 text-center">
          <p className="text-lg font-semibold text-slate-900">Δεν υπάρχουν ακόμη καταχωρήσεις εργασίας</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Προσθέστε εργαζόμενους και πελάτες, και συνδέστε την εφαρμογή καταγραφής χρόνου (μέσω API key) ή
            καταχωρήστε χειροκίνητα.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href={`/${lang}/dashboard/employees`} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
              Εργαζόμενοι
            </Link>
            <Link href={`/${lang}/dashboard/clients`} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Πελάτες
            </Link>
            <Link href={`/${lang}/dashboard/api-keys`} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              API Keys
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Ώρες" value={hrs(summary.hours)} />
            <Stat label="Κόστος" value={eur(summary.cost)} />
            <Stat label="Έσοδα" value={eur(summary.revenue)} />
            <Stat
              label="Κέρδος"
              value={eur(summary.profit)}
              tone={summary.profit >= 0 ? 'pos' : 'neg'}
            />
            <Stat label="Αξιοποίηση" value={pct(summary.utilization)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">Ώρες ανά πελάτη (top 6)</h2>
              <div className="space-y-3">
                {topClients.map((c) => (
                  <div key={c.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate pr-2 text-slate-700">{c.name}</span>
                      <span className="shrink-0 font-medium text-slate-500">{hrs(c.hours)}</span>
                    </div>
                    <ProgressBar value={(c.hours / maxHours) * 100} />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex flex-col items-center p-5">
              <h2 className="mb-3 self-start text-sm font-semibold text-slate-900">Χρεώσιμες vs Overhead</h2>
              <Donut
                className="w-40"
                centerLabel={num(summary.billableHours + summary.nonBillableHours)}
                centerSub="ώρες"
                segments={[
                  { value: summary.billableHours, color: '#2563EB' },
                  { value: summary.nonBillableHours || 0.0001, color: '#f59e0b' },
                ]}
              />
              <div className="mt-4 flex gap-4 text-xs">
                <Legend color="#2563EB" label="Χρεώσιμες" value={hrs(summary.billableHours)} />
                <Legend color="#f59e0b" label="Overhead" value={hrs(summary.nonBillableHours)} />
              </div>
            </Card>
          </div>

          <OverviewClientsTable clients={clients} lang={lang} />

          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Εργαζόμενοι</h2>
            </div>
            <Table
              head={['Εργαζόμενος', 'Ώρες', 'Κόστος', 'Πελάτες']}
              rows={employees.map((e) => [
                e.name,
                hrs(e.hours),
                eur(e.cost),
                String(e.clients.length),
              ])}
            />
          </Card>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={
          'mt-1 text-xl font-bold tracking-tight ' +
          (tone === 'pos' ? 'text-emerald-600' : tone === 'neg' ? 'text-red-500' : 'text-slate-900')
        }
      >
        {value}
      </p>
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

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
            {head.map((h, i) => (
              <th key={i} className={'px-5 py-3 font-medium ' + (i === 0 ? '' : 'text-right')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t border-slate-50 hover:bg-slate-50/60">
              {row.map((cell, ci) => (
                <td key={ci} className={'px-5 py-3 ' + (ci === 0 ? 'text-slate-800' : 'text-right tabular-nums text-slate-600')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
