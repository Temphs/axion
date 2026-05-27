import { getEmployeesOverview } from '@/lib/stats'
import { getSettings, hoursPerMonth } from '@/lib/settings'
import { EmployeesGrid } from '@/components/dashboard/EmployeesGrid'

export default async function EmployeesPage({ params }: PageProps<'/[lang]/dashboard/employees'>) {
  const { lang } = await params
  const [employees, settings] = await Promise.all([getEmployeesOverview(), getSettings()])

  return <EmployeesGrid lang={lang} employees={employees} hoursPerMonth={hoursPerMonth(settings)} />
}
