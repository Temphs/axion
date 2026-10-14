import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/db'
import { businessToday } from '@/lib/entryDate'

// The entry terminal: a phone-sized screen an employee opens from a personal
// link, with no account and no password. The token in that link is the whole
// credential, so everything it can reach is deliberately narrow — it identifies
// exactly one employee and can only touch that employee's own time entries.

// URL-safe, 144 bits of entropy, short enough to survive being pasted into Viber.
export function generateAccessToken(): string {
  return randomBytes(18).toString('base64url')
}

export type TerminalSession = {
  employeeId: string
  employeeName: string
  userId: string
}

// Resolves a terminal token to its employee. Inactive employees are refused:
// deactivating someone should close their terminal without a second step.
export async function resolveTerminal(token: string): Promise<TerminalSession | null> {
  if (!token || token.length < 16) return null
  const employee = await prisma.employee.findUnique({
    where: { accessToken: token },
    select: { id: true, name: true, userId: true, active: true },
  })
  if (!employee || !employee.active) return null
  return { employeeId: employee.id, employeeName: employee.name, userId: employee.userId }
}

// How far back the employee may fix their own entries. Long enough to catch
// "I forgot Friday", short enough that closed months stay closed.
export const EDIT_WINDOW_DAYS = 7

// Counted in Greek calendar days, the same "today" the employee's phone shows:
// from today back EDIT_WINDOW_DAYS days, never ahead of today.
export function isWithinEditWindow(date: Date, now = new Date()): boolean {
  const today = businessToday(now).getTime()
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return day >= today - EDIT_WINDOW_DAYS * 86_400_000 && day <= today
}

/* ─── the data one terminal screen needs ─────────────────────────── */

export type TerminalClient = { id: string; name: string }

export type TerminalEntry = {
  id: string
  date: string // YYYY-MM-DD
  clientId: string
  clientName: string
  hours: number
  workType: string | null
  notes: string | null
  editable: boolean
}

export type TerminalData = {
  employeeName: string
  date: string
  // Ordered by what this employee touched most recently: with hundreds of
  // clients on the account, the first few buttons cover almost every entry.
  recentClients: TerminalClient[]
  allClients: TerminalClient[]
  workTypes: string[]
  entries: TerminalEntry[]
  dayHours: number
}

const RECENT_CLIENTS = 8
const RECENT_LOOKBACK_ENTRIES = 200

export function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

// Entries are stored at UTC midnight; a YYYY-MM-DD string maps to one day.
// Anything missing or impossible (2026-02-31) falls back to today in Greece,
// so between midnight and 03:00 the screen doesn't open on yesterday.
export function parseDayParam(value: string | null, now = new Date()): Date {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
    const day = new Date(Date.UTC(y, mo - 1, d))
    if (day.getUTCFullYear() === y && day.getUTCMonth() === mo - 1 && day.getUTCDate() === d) return day
  }
  return businessToday(now)
}

// Free text from the terminal, trimmed and capped like the rest of the API.
// Returns undefined when the value is too long, so the caller can reject it.
export function terminalText(value: unknown, max: number): string | null | undefined {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  if (text.length > max) return undefined
  return text || null
}

export async function loadTerminalData(
  session: TerminalSession,
  day: Date,
  now = new Date()
): Promise<TerminalData> {
  const { userId, employeeId } = session
  const dayEnd = new Date(day.getTime() + 86_399_999)

  const [recent, allClients, dayEntries] = await Promise.all([
    // Recent history drives both the client shortcuts and the work-type chips,
    // so the terminal is pre-filled with this person's own vocabulary.
    prisma.workEntry.findMany({
      where: { userId, employeeId },
      orderBy: { date: 'desc' },
      take: RECENT_LOOKBACK_ENTRIES,
      select: { clientId: true, workType: true, client: { select: { id: true, name: true, active: true } } },
    }),
    prisma.client.findMany({
      where: { userId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.workEntry.findMany({
      where: { userId, employeeId, date: { gte: day, lte: dayEnd } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        date: true,
        minutes: true,
        workType: true,
        notes: true,
        client: { select: { id: true, name: true } },
      },
    }),
  ])

  const recentClients: TerminalClient[] = []
  const seen = new Set<string>()
  for (const row of recent) {
    if (!row.client?.active || seen.has(row.clientId)) continue
    seen.add(row.clientId)
    recentClients.push({ id: row.client.id, name: row.client.name })
    if (recentClients.length >= RECENT_CLIENTS) break
  }

  const workTypes: string[] = []
  for (const row of recent) {
    const type = row.workType?.trim()
    if (type && !workTypes.includes(type)) workTypes.push(type)
    if (workTypes.length >= 6) break
  }

  const entries: TerminalEntry[] = dayEntries.map((e) => ({
    id: e.id,
    date: isoDate(e.date),
    clientId: e.client.id,
    clientName: e.client.name,
    hours: e.minutes / 60,
    workType: e.workType,
    notes: e.notes,
    editable: isWithinEditWindow(e.date, now),
  }))

  return {
    employeeName: session.employeeName,
    date: isoDate(day),
    recentClients,
    allClients,
    workTypes,
    entries,
    dayHours: entries.reduce((s, e) => s + e.hours, 0),
  }
}
