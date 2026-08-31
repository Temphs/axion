import type { EmploymentPeriod } from '@/lib/profitability'

// ── Employment dates are not stored yet ──────────────────────────────────────
// The Employee model carries `active` but no hire/leave dates (prisma/schema.prisma).
// Every consumer is already written against this resolver, so the day the columns
// land the only edit needed is inside this file plus the Prisma `select`.
//
//   ALTER TABLE Employee ADD COLUMN employedFrom  DATETIME;
//   ALTER TABLE Employee ADD COLUMN employedUntil DATETIME;
//
// Until then the answer is "not recorded" — never a guessed date. Inventing a
// hire date would silently change every expected-hours figure downstream, which
// is exactly the number the owner is trying to trust.

export type EmploymentSource = 'recorded' | 'unknown'

export type EmploymentInfo = EmploymentPeriod & {
  source: EmploymentSource
  // Observed facts, not assumptions: the span of real time entries. The UI shows
  // these under their own label when no employment dates exist, so the panel can
  // say something true instead of showing an empty row.
  firstEntryOn: Date | null
  lastEntryOn: Date | null
  active: boolean
}

type EmployeeRecord = { active: boolean } & Partial<{
  employedFrom: Date | null
  employedUntil: Date | null
}>

export function resolveEmployment(
  employee: EmployeeRecord,
  observed: { firstEntryOn: Date | null; lastEntryOn: Date | null }
): EmploymentInfo {
  const startedOn = employee.employedFrom ?? null
  const endedOn = employee.employedUntil ?? null
  return {
    startedOn,
    endedOn,
    source: startedOn || endedOn ? 'recorded' : 'unknown',
    firstEntryOn: observed.firstEntryOn,
    lastEntryOn: observed.lastEntryOn,
    active: employee.active,
  }
}
