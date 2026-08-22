import { prisma } from '@/lib/db'

export type Settings = {
  id: number
  userId: string
  hoursPerDay: number
  daysPerMonth: number
  includeOverhead: boolean
  updatedAt: Date
}

// Each account has its own config row. Created with defaults on first read.
// Callers run concurrently (several dashboard queries sit in the same
// Promise.all), so this has to tolerate two racing first-reads: upsert does the
// work in one statement, and a loser that still trips the userId unique
// constraint re-reads the row the winner just wrote.
export async function getSettings(userId: string): Promise<Settings> {
  try {
    return await prisma.settings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    })
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err
    const existing = await prisma.settings.findUnique({ where: { userId } })
    if (!existing) throw err
    return existing
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002'
}

export function hoursPerMonth(s: { hoursPerDay: number; daysPerMonth: number }): number {
  return s.hoursPerDay * s.daysPerMonth
}
