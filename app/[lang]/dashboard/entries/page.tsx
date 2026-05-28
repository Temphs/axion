import { prisma } from '@/lib/db'
import { EntriesManager } from '@/components/dashboard/EntriesManager'

const RANGE_LIMIT = 500

function isIso(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

export default async function EntriesPage({ searchParams }: PageProps<'/[lang]/dashboard/entries'>) {
  const sp = await searchParams
  const from = isIso(sp.from) ? sp.from : ''
  const to = isIso(sp.to) ? sp.to : ''
  const filtering = Boolean(from || to)

  // Entries are stored at UTC midnight; match the calendar range inclusively.
  const dateFilter: Record<string, Date> = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) {
    const end = new Date(to)
    end.setUTCHours(23, 59, 59, 999)
    dateFilter.lte = end
  }
  const where = filtering ? { date: dateFilter } : {}

  const [entries, employees, clients] = await Promise.all([
    prisma.workEntry.findMany({
      where,
      orderBy: filtering ? [{ date: 'desc' }, { employee: { name: 'asc' } }] : { date: 'desc' },
      take: filtering ? RANGE_LIMIT : 50,
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

  return (
    <EntriesManager
      entries={data}
      employees={employees}
      clients={clients}
      from={from}
      to={to}
      truncated={filtering && entries.length === RANGE_LIMIT}
    />
  )
}
