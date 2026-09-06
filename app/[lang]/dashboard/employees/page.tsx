import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getEmployeesOverview, parseStatsFilter } from '@/lib/stats'
import { getSettings, hoursPerMonth } from '@/lib/settings'
import { buildWorkforce } from '@/lib/workforce'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { EmployeesGrid } from '@/components/dashboard/EmployeesGrid'
import { EmployeePerformanceTable } from '@/components/workforce/EmployeePerformanceTable'
import { EmployeeProfitabilityPanel } from '@/components/workforce/EmployeeProfitabilityPanel'
import { CapacityPanel } from '@/components/workforce/CapacityPanel'

export default async function EmployeesPage({ params, searchParams }: PageProps<'/[lang]/dashboard/employees'>) {
  const { lang } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/${lang}/login`)

  const sp = await searchParams
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string') usp.set(k, v)
  const parsed = parseStatsFilter(usp)
  const filter = 'error' in parsed ? {} : parsed.filter

  const [employees, settings, wf] = await Promise.all([
    getEmployeesOverview(user.id),
    getSettings(user.id),
    buildWorkforce(user.id, { from: filter.from, to: filter.to, all: usp.get('range') === 'all' }),
  ])

  const periodLabel = wf.period.all
    ? 'Όλο το ιστορικό'
    : new Intl.DateTimeFormat('el-GR', { month: 'long', year: 'numeric' }).format(new Date(wf.period.from))

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Εργαζόμενοι</h1>
          <p className="mt-0.5 text-sm text-blue-200/80">Απόδοση, κερδοφορία και διαθεσιμότητα της ομάδας</p>
        </div>
        <DateRangeFilter />
      </header>

      <EmployeeProfitabilityPanel
        employees={wf.employees}
        clients={wf.clients}
        periodLabel={periodLabel}
        lang={lang}
      />

      <EmployeePerformanceTable employees={wf.employees} lang={lang} />

      <CapacityPanel capacity={wf.capacity} lang={lang} />

      <EmployeesGrid lang={lang} employees={employees} hoursPerMonth={hoursPerMonth(settings)} />
    </div>
  )
}
