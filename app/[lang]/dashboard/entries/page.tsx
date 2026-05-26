import { prisma } from '@/lib/db'
import { EntriesManager } from '@/components/dashboard/EntriesManager'

export default async function EntriesPage() {
  const [entries, employees, clients] = await Promise.all([
    prisma.workEntry.findMany({
      orderBy: { date: 'desc' },
      take: 50,
      include: {
        employee: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    }),
    prisma.employee.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.client.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  const data = entries.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    minutes: e.minutes,
    workType: e.workType,
    notes: e.notes,
    employee: e.employee,
    client: e.client,
  }))

  return <EntriesManager entries={data} employees={employees} clients={clients} />
}
