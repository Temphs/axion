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
export async function getSettings(userId: string): Promise<Settings> {
  const existing = await prisma.settings.findUnique({ where: { userId } })
  if (existing) return existing
  return prisma.settings.create({ data: { userId } })
}

export function hoursPerMonth(s: { hoursPerDay: number; daysPerMonth: number }): number {
  return s.hoursPerDay * s.daysPerMonth
}
