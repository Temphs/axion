import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { EntriesManager } from '@/components/dashboard/EntriesManager'

const RANGE_LIMIT = 500

function isIso(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

export default async function EntriesPage({ params, searchParams }: PageProps<'/[lang]/dashboard/entries'>) {
  const { lang } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/${lang}/login`)
  const sp = await searchParams
  const from = isIso(sp.from) ? sp.from : ''
  const to = isIso(sp.to) ? sp.to : ''
  const employeeId = typeof sp.employeeId === 'string' ? sp.employeeId : ''
  const filtering = Boolean(from || to || employeeId)

  // Entries are stored at UTC midnight; match the calendar range inclusively.
  const dateFilter: Record<string, Date> = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) {
    const end = new Date(to)
    end.setUTCHours(23, 59, 59, 999)
    dateFilter.lte = end
  }
  const where = {
    userId: user.id,
    ...(from || to ? { date: dateFilter } : {}),
    ...(employeeId ? { employeeId } : {}),
  }

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
    // Inactive people still appear in history, so the picker must list them too.
    prisma.employee.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' }, select: { id: true, name: true, active: true } }),
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' }, select: { id: true, name: true, active: true } }),
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
      employeeId={employeeId}
      truncated={filtering && entries.length === RANGE_LIMIT}
    />
  )
}
