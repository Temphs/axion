import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getEmployeesOverview } from '@/lib/stats'
import { getSettings, hoursPerMonth } from '@/lib/settings'
import { EmployeesGrid } from '@/components/dashboard/EmployeesGrid'

export default async function EmployeesPage({ params }: PageProps<'/[lang]/dashboard/employees'>) {
  const { lang } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/${lang}/login`)
  const [employees, settings] = await Promise.all([getEmployeesOverview(user.id), getSettings(user.id)])

  return <EmployeesGrid lang={lang} employees={employees} hoursPerMonth={hoursPerMonth(settings)} />
}
