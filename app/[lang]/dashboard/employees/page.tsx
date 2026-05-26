import { prisma } from '@/lib/db'
import { getSettings, hoursPerMonth } from '@/lib/settings'
import { EmployeesManager } from '@/components/dashboard/EmployeesManager'

export default async function EmployeesPage() {
  const [employees, settings] = await Promise.all([
    prisma.employee.findMany({ orderBy: { name: 'asc' } }),
    getSettings(),
  ])
  const hpm = hoursPerMonth(settings)

  const data = employees.map((e) => ({
    id: e.id,
    name: e.name,
    monthlyCost: e.monthlyCost,
    costPerHour: hpm > 0 ? e.monthlyCost / hpm : 0,
    active: e.active,
    notes: e.notes,
  }))

  return <EmployeesManager initial={data} hoursPerMonth={hpm} />
}
