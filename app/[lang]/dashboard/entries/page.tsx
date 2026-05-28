import { prisma } from '@/lib/db'
import { EntriesManager } from '@/components/dashboard/EntriesManager'

export default async function EntriesPage({ searchParams }: PageProps<'/[lang]/dashboard/entries'>) {
  const sp = await searchParams
  const raw = typeof sp.date === 'string' ? sp.date : undefined
  const activeDate = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null

  // Entries are stored at UTC midnight; match the whole calendar day inclusively.
  let where = {}
  if (activeDate) {
    const start = new Date(activeDate)
    const end = new Date(activeDate)
    end.setUTCHours(23, 59, 59, 999)
    where = { date: { gte: start, lte: end } }
  }

  const [entries, employees, clients] = await Promise.all([
    prisma.workEntry.findMany({
      where,
      orderBy: activeDate
        ? [{ employee: { name: 'asc' } }, { client: { name: 'asc' } }]
        : { date: 'desc' },
      ...(activeDate ? {} : { take: 50 }),
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

  return <EntriesManager entries={data} employees={employees} clients={clients} activeDate={activeDate} />
}
