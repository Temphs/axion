import { prisma } from '@/lib/db'

export type Settings = {
  id: number
  userId: string
  hoursPerDay: number
  daysPerMonth: number
  includeOverhead: boolean
  updatedAt: Date
}

// P2002: unique constraint failed.
function isUniqueViolation(e: unknown): boolean {
  return !!e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002'
}

// Each account has its own config row, created with defaults on first read.
//
// One page render fans out into several concurrent readers — the layout
// sidebar, the overview builder, the employees overview — so on a brand-new
// account they all miss and all try to create the row. Whoever loses that race
// gets a unique-constraint error, which used to surface as a 500 on the very
// first dashboard visit. The read stays a plain lookup (no write on the common
// path, which matters against a remote Turso database); only the first-ever
// create tolerates a concurrent winner and re-reads its row.
export async function getSettings(userId: string): Promise<Settings> {
  const existing = await prisma.settings.findUnique({ where: { userId } })
  if (existing) return existing

  try {
    return await prisma.settings.create({ data: { userId } })
  } catch (e) {
    if (!isUniqueViolation(e)) throw e
    const raced = await prisma.settings.findUnique({ where: { userId } })
    if (raced) return raced
    throw e
  }
}

export function hoursPerMonth(s: { hoursPerDay: number; daysPerMonth: number }): number {
  return s.hoursPerDay * s.daysPerMonth
}
