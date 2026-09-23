import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/db'

// Employees have no login of their own (only the manager/User account does),
// so a personal work-log link is authenticated by a long random token instead
// of a session — the same "magic link" model used for e.g. a Calendly slot.
// Knowing the token is exactly the access a link grants: read/write for that
// one employee's own entries, nothing else.
function generateToken(): string {
  return randomBytes(24).toString('base64url')
}

// Returns the employee's existing log token, or mints one on first use.
// Called only from authenticated manager routes/pages — token creation itself
// always happens under a session, never from the public log page.
export async function getOrCreateLogToken(userId: string, employeeId: string): Promise<string | null> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, userId },
    select: { logToken: true },
  })
  if (!employee) return null
  if (employee.logToken) return employee.logToken

  // Extremely unlikely to collide (144 bits of randomness), but retry once
  // rather than fail outright if it ever does.
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateToken()
    try {
      await prisma.employee.update({ where: { id: employeeId }, data: { logToken: token } })
      return token
    } catch (e) {
      if (attempt === 2) throw e
    }
  }
  return null
}

// Invalidates the current link (e.g. it was shared somewhere it shouldn't
// have been) and issues a fresh one.
export async function rotateLogToken(userId: string, employeeId: string): Promise<string | null> {
  const owned = await prisma.employee.findFirst({ where: { id: employeeId, userId }, select: { id: true } })
  if (!owned) return null
  const token = generateToken()
  await prisma.employee.update({ where: { id: employeeId }, data: { logToken: token } })
  return token
}

export type LogEmployee = {
  id: string
  userId: string
  name: string
  active: boolean
}

export type LogClient = { id: string; name: string }

export type RecentLogEntry = {
  id: string
  date: string
  clientName: string
  hours: number
  workType: string | null
}

export type LogPageData = {
  employee: LogEmployee
  clients: LogClient[]
  recent: RecentLogEntry[]
}

// Everything the public work-log page needs, resolved purely from the token.
export async function getLogPageData(token: string): Promise<LogPageData | null> {
  const employee = await prisma.employee.findUnique({
    where: { logToken: token },
    select: { id: true, userId: true, name: true, active: true },
  })
  if (!employee) return null

  const [clients, recent] = await Promise.all([
    prisma.client.findMany({
      where: { userId: employee.userId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.workEntry.findMany({
      where: { employeeId: employee.id },
      orderBy: { date: 'desc' },
      take: 5,
      select: { id: true, date: true, minutes: true, workType: true, client: { select: { name: true } } },
    }),
  ])

  return {
    employee,
    clients,
    recent: recent.map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      clientName: r.client.name,
      hours: r.minutes / 60,
      workType: r.workType,
    })),
  }
}

export type CreateLogEntryInput = {
  clientId?: unknown
  date?: unknown
  hours?: unknown
  workType?: unknown
  notes?: unknown
}

const MAX_HOURS_PER_ENTRY = 16

// Validates and writes one entry on behalf of the token's employee. Scoped to
// that employee's own userId/employeeId — the token can never write into
// another account or under another employee's name.
export async function createLogEntry(
  token: string,
  input: CreateLogEntryInput
): Promise<{ entry: RecentLogEntry } | { error: string }> {
  const employee = await prisma.employee.findUnique({
    where: { logToken: token },
    select: { id: true, userId: true, active: true },
  })
  if (!employee) return { error: 'Ο σύνδεσμος δεν είναι έγκυρος.' }
  if (!employee.active) return { error: 'Ο λογαριασμός σου είναι ανενεργός. Επικοινώνησε με τον λογιστή σου.' }

  if (typeof input.clientId !== 'string' || !input.clientId) return { error: 'Επίλεξε πελάτη.' }
  if (typeof input.date !== 'string' || !input.date) return { error: 'Επίλεξε ημερομηνία.' }
  const date = new Date(input.date)
  if (Number.isNaN(date.getTime())) return { error: 'Μη έγκυρη ημερομηνία.' }

  if (typeof input.hours !== 'number' || !Number.isFinite(input.hours) || input.hours <= 0) {
    return { error: 'Οι ώρες πρέπει να είναι θετικός αριθμός.' }
  }
  if (input.hours > MAX_HOURS_PER_ENTRY) {
    return { error: `Η καταχώρηση δεν μπορεί να ξεπερνά τις ${MAX_HOURS_PER_ENTRY} ώρες.` }
  }
  const minutes = Math.round(input.hours * 60)

  const client = await prisma.client.findFirst({
    where: { id: input.clientId, userId: employee.userId, active: true },
    select: { id: true, name: true },
  })
  if (!client) return { error: 'Ο πελάτης δεν βρέθηκε.' }

  const workType = typeof input.workType === 'string' ? input.workType.trim() || null : null
  const notes = typeof input.notes === 'string' ? input.notes.trim() || null : null

  const created = await prisma.workEntry.create({
    data: { userId: employee.userId, employeeId: employee.id, clientId: client.id, date, minutes, workType, notes },
  })

  return {
    entry: {
      id: created.id,
      date: created.date.toISOString(),
      clientName: client.name,
      hours: created.minutes / 60,
      workType: created.workType,
    },
  }
}
