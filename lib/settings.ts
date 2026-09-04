import { prisma } from '@/lib/db'

export type Settings = {
  id: number
  userId: string
  hoursPerDay: number
  daysPerMonth: number
  includeOverhead: boolean
  updatedAt: Date
}

// Each account has its own config row, created with defaults on first read.
// A new user's first page load reads this from the layout and the page at the
// same time: both find no row and both insert, and the loser of that race used
// to fail on the unique constraint and take the whole render down. Losing the
// race is expected, so re-read instead of throwing.
export async function getSettings(userId: string): Promise<Settings> {
  const existing = await prisma.settings.findUnique({ where: { userId } })
  if (existing) return existing
  try {
    return await prisma.settings.create({ data: { userId } })
  } catch (err) {
    const raced = await prisma.settings.findUnique({ where: { userId } })
    if (raced) return raced
    throw err // the insert failed for some other reason
  }
}

export function hoursPerMonth(s: { hoursPerDay: number; daysPerMonth: number }): number {
  return s.hoursPerDay * s.daysPerMonth
}
