import { prisma } from '@/lib/db'

export type Settings = {
  id: number
  hoursPerDay: number
  daysPerMonth: number
  includeOverhead: boolean
  updatedAt: Date
}

// The global config lives in a single row (id = 1). Created with defaults on first read.
export async function getSettings(): Promise<Settings> {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } })
  if (existing) return existing
  return prisma.settings.create({ data: { id: 1 } })
}

export function hoursPerMonth(s: { hoursPerDay: number; daysPerMonth: number }): number {
  return s.hoursPerDay * s.daysPerMonth
}
