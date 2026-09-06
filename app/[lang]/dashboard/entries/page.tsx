import { redirect } from 'next/navigation'
import type { Prisma } from '@/lib/generated/prisma/client'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { EntriesManager } from '@/components/dashboard/EntriesManager'

const PAGE_SIZE = 100

function isIso(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

// SQLite's LIKE only folds case for ASCII, so «τρόφιμα» would never match a
// client stored as «Τρόφιμα» — wrong case *and* an accent. Fold the text in JS
// instead: lower-case it in Greek, strip the combining accents, and normalise
// final sigma, so accents and capitals stop mattering.
function fold(value: string): string {
  return value
    .toLocaleLowerCase('el')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ς/g, 'σ')
}

// Client, employee and work type are all low-cardinality lookups, so they can
// be matched in memory and turned into an id filter. Notes are free text per
// entry, so they stay a LIKE — case-sensitive for Greek, which is the one
// corner this cannot reach without a normalised column in the schema.
function matchIds<T extends { id: string; name: string }>(rows: T[], needle: string): string[] {
  return rows.filter((r) => fold(r.name).includes(needle)).map((r) => r.id)
}

export default async function EntriesPage({ params, searchParams }: PageProps<'/[lang]/dashboard/entries'>) {
  const { lang } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/${lang}/login`)
  const sp = await searchParams
  const from = isIso(sp.from) ? sp.from : ''
  const to = isIso(sp.to) ? sp.to : ''
  const employeeId = typeof sp.employeeId === 'string' ? sp.employeeId : ''
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const page = Math.max(1, Number(typeof sp.page === 'string' ? sp.page : '1') || 1)

  // Entries are stored at UTC midnight; match the calendar range inclusively.
  const dateFilter: Record<string, Date> = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) {
    const end = new Date(to)
    end.setUTCHours(23, 59, 59, 999)
    dateFilter.lte = end
  }

  // Inactive people and clients still appear in history, so the pickers — and
  // the search below — must cover them too.
  const [employees, clients] = await Promise.all([
    prisma.employee.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' }, select: { id: true, name: true, active: true } }),
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' }, select: { id: true, name: true, active: true } }),
  ])

  let search: Prisma.WorkEntryWhereInput = {}
  if (q) {
    const needle = fold(q)
    const types = await prisma.workEntry.groupBy({ by: ['workType'], where: { userId: user.id } })
    search = {
      OR: [
        { clientId: { in: matchIds(clients, needle) } },
        { employeeId: { in: matchIds(employees, needle) } },
        {
          workType: {
            in: types
              .map((t) => t.workType)
              .filter((t): t is string => !!t && fold(t).includes(needle)),
          },
        },
        { notes: { contains: q } },
      ],
    }
  }

  // The search runs over the whole history, not just the page being shown, so
  // this doubles as the log: every entry ever made is reachable from here.
  const where: Prisma.WorkEntryWhereInput = {
    userId: user.id,
    ...(from || to ? { date: dateFilter } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...search,
  }

  const [entries, totals] = await Promise.all([
    prisma.workEntry.findMany({
      where,
      orderBy: [{ date: 'desc' }, { employee: { name: 'asc' } }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        employee: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    }),
    // Count and hours cover every match, so the header reports the whole log
    // rather than whatever fitted on this page.
    prisma.workEntry.aggregate({ where, _count: { _all: true }, _sum: { minutes: true } }),
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
      q={q}
      page={page}
      pageSize={PAGE_SIZE}
      total={totals._count._all}
      totalHours={(totals._sum.minutes ?? 0) / 60}
    />
  )
}
