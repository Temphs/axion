// Pure calculation core for Workforce & Client Profitability.
// No Prisma/Next imports — everything here is unit-testable.
//
// Metric definitions (surfaced as tooltips in the UI):
//   Billable utilization   = billable hours / available working hours
//   Labor cost             = hours worked × fully-loaded hourly cost
//   Attributed revenue     = client revenue allocated to employees pro-rata
//                            by their hours on that client in that month
//   Contribution           = attributed revenue − labor cost (all hours)
//   Contribution margin    = contribution / attributed revenue
//   Revenue per hour       = attributed revenue / billable hours
//   Unbilled hours         = hours on overhead clients + hours on billable
//                            clients with no configured revenue

const MS_PER_DAY = 86_400_000

/* ─── safe math ──────────────────────────────────────────────── */

// null = undefined ratio (division by zero), distinct from a real 0.
export function safeRatio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(denominator) || denominator === 0) return null
  return numerator / denominator
}

export function contribution(revenue: number, laborCost: number): number {
  return revenue - laborCost
}

/* ─── employee capacity & rate ───────────────────────────────── */

// Monthly hours an employee is contracted for, falling back to the account
// default. Single source of truth for both capacity and hourly cost.
export function monthlyHoursFor(
  employee: { contractHoursPerMonth?: number | null },
  accountHoursPerMonth: number
): number {
  return employee.contractHoursPerMonth ?? accountHoursPerMonth
}

// Fully loaded hourly cost: monthly salary spread over contracted hours.
export function costPerHourFor(
  employee: { monthlyCost: number; contractHoursPerMonth?: number | null },
  accountHoursPerMonth: number
): number {
  const hours = monthlyHoursFor(employee, accountHoursPerMonth)
  return hours > 0 ? employee.monthlyCost / hours : 0
}

export function contributionMargin(revenue: number, laborCost: number): number | null {
  return safeRatio(revenue - laborCost, revenue)
}

/* ─── periods ────────────────────────────────────────────────── */

export type Period = { from: Date; to: Date }

// All calendar math is UTC, matching how WorkEntry dates are stored.
export function monthKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

// Whole UTC days since the epoch — lets an overlap be measured in calendar
// days regardless of the time-of-day on either bound.
function dayIndex(d: Date): number {
  return Math.floor(d.getTime() / MS_PER_DAY)
}

// For each calendar month intersecting [from, to]: fraction of that month
// covered by the period (by days). Sum of fractions = "months" in the period,
// used to prorate monthly revenue, planned hours and available hours.
export function monthCoverage(from: Date, to: Date): Map<string, number> {
  const out = new Map<string, number>()
  if (to < from) return out
  let y = from.getUTCFullYear()
  let m = from.getUTCMonth()
  const endY = to.getUTCFullYear()
  const endM = to.getUTCMonth()
  while (y < endY || (y === endY && m <= endM)) {
    const dim = daysInMonth(y, m)
    const monthStart = new Date(Date.UTC(y, m, 1))
    const monthEnd = new Date(Date.UTC(y, m, dim, 23, 59, 59, 999))
    const overlapStart = from > monthStart ? from : monthStart
    const overlapEnd = to < monthEnd ? to : monthEnd
    // Count calendar days inclusively. Rounding the raw millisecond span
    // instead would let a month-to-date period ending at, say, 14:00 on the
    // 30th round up to a full month, so a half-finished month claimed a whole
    // month of revenue while the trend chart prorated the same month by
    // elapsed days — the two disagreed on screen.
    const overlapDays = Math.max(0, dayIndex(overlapEnd) - dayIndex(overlapStart) + 1)
    out.set(`${y}-${String(m + 1).padStart(2, '0')}`, Math.min(1, overlapDays / dim))
    m++
    if (m > 11) {
      m = 0
      y++
    }
  }
  return out
}

export function monthsInPeriod(from: Date, to: Date): number {
  let total = 0
  for (const f of monthCoverage(from, to).values()) total += f
  return total
}

// The comparable preceding window. Month-aligned periods (starting on the 1st)
// shift back by whole calendar months; arbitrary ranges shift by duration.
export function previousPeriodOf(from: Date, to: Date): Period {
  if (from.getUTCDate() === 1) {
    const monthCount = monthCoverage(from, to).size
    const prevFrom = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - monthCount, 1))
    const prevTo = new Date(from.getTime() - 1)
    return { from: prevFrom, to: prevTo }
  }
  const duration = to.getTime() - from.getTime()
  return { from: new Date(from.getTime() - duration - MS_PER_DAY), to: new Date(from.getTime() - 1) }
}

/* ─── revenue attribution ────────────────────────────────────── */

// Allocates an amount pro-rata to hour shares. Returns empty map when no hours.
// Centralized so the attribution model can be swapped later.
export function allocateProRata(amount: number, hoursByKey: Map<string, number>): Map<string, number> {
  const total = [...hoursByKey.values()].reduce((s, h) => s + h, 0)
  const out = new Map<string, number>()
  if (total <= 0 || amount === 0) return out
  for (const [key, hours] of hoursByKey) out.set(key, (amount * hours) / total)
  return out
}

/* ─── statuses ───────────────────────────────────────────────── */

export type ClientHealth = 'healthy' | 'watch' | 'critical' | 'overhead'

// Margin thresholds for professional-service work: ≥45% healthy, ≥20% watch.
export function clientHealth(margin: number | null, billable: boolean, hasRevenue: boolean): ClientHealth {
  if (!billable) return 'overhead'
  if (!hasRevenue || margin === null) return 'critical' // hours logged, no revenue configured
  if (margin >= 0.45) return 'healthy'
  if (margin >= 0.2) return 'watch'
  return 'critical'
}

/* ─── simple owner-facing ratios ─────────────────────────────── */

// Share of logged time spent on billable clients. Deliberately *not* measured
// against contracted availability: this answers "of the work that was done,
// how much was for paying clients", which needs no assumptions.
export function billableShare(billableHours: number, totalHours: number): number | null {
  return safeRatio(billableHours, totalHours)
}

// Relative change between two periods; null when there is no comparable base.
export function percentChange(current: number, previous: number | null | undefined): number | null {
  if (previous === undefined || previous === null || previous === 0) return null
  return (current - previous) / Math.abs(previous)
}

// Share of expected working days that actually have a time entry, averaged over
// active employees. Approximate by design: it assumes a Mon–Fri week and does
// not know about leave, so it flags "entries are lagging", not absenteeism.
export function entryCompleteness(
  daysWithEntriesPerEmployee: number[],
  expectedWorkingDays: number
): number | null {
  if (expectedWorkingDays <= 0 || daysWithEntriesPerEmployee.length === 0) return null
  const expectedTotal = expectedWorkingDays * daysWithEntriesPerEmployee.length
  const actualTotal = daysWithEntriesPerEmployee.reduce((s, d) => s + Math.min(d, expectedWorkingDays), 0)
  return safeRatio(actualTotal, expectedTotal)
}

// Mon–Fri days between two dates, inclusive, capped at `until`.
export function workingDaysBetween(from: Date, to: Date, until = new Date()): number {
  const end = to < until ? to : until
  let count = 0
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  while (cursor <= end) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) count++
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return count
}

/* ─── employment window ──────────────────────────────────────── */

// When someone actually worked here. Both ends are optional: an account that
// has not recorded them is treated as "employed for the whole period", which
// is the only assumption that cannot silently invent absences.
// `endedOn` is the last day of employment (inclusive).
export type EmploymentPeriod = {
  startedOn: Date | null
  endedOn: Date | null
}

export type EmploymentStatus = 'active' | 'former'

export function employmentStatusOf(employment: EmploymentPeriod, now = new Date()): EmploymentStatus {
  return employment.endedOn !== null && employment.endedOn < now ? 'former' : 'active'
}

// The slice of [from, to] the person was actually employed, capped at `until`
// (today) so an unfinished period never expects hours that cannot exist yet.
// Returns null when the two windows do not overlap at all.
export function employedWindow(
  from: Date,
  to: Date,
  employment: EmploymentPeriod,
  until = new Date()
): Period | null {
  let start = from
  let end = to < until ? to : until
  if (employment.startedOn && employment.startedOn > start) start = employment.startedOn
  if (employment.endedOn && employment.endedOn < end) end = employment.endedOn
  return end < start ? null : { from: start, to: end }
}

// Mon–Fri days expected of this person in this period. Days before the hire
// date or after the leaving date are not expected, so they never read as
// "missing data".
export function expectedWorkingDaysFor(
  from: Date,
  to: Date,
  employment: EmploymentPeriod,
  until = new Date()
): number {
  const window = employedWindow(from, to, employment, until)
  return window ? workingDaysBetween(window.from, window.to, until) : 0
}

export function expectedHoursFor(workingDays: number, hoursPerDay: number): number {
  return Math.max(0, workingDays) * Math.max(0, hoursPerDay)
}

// Days with a time entry ÷ days we expected one. Capped at 100%: logging on a
// Saturday is not "more than complete".
export function completenessOf(daysWithEntries: number, expectedWorkingDays: number): number | null {
  if (expectedWorkingDays <= 0) return null
  return Math.min(1, daysWithEntries / expectedWorkingDays)
}

/* ─── day-by-day log ─────────────────────────────────────────── */

// 'ok' = a full day logged, 'short' = something logged but less than expected,
// 'missing' = an expected working day with no entry at all.
export type DayStatus = 'ok' | 'short' | 'missing'

export type DayLogEntry = {
  date: string // YYYY-MM-DD (UTC)
  hours: number
  expected: number
  status: DayStatus
}

export function isoDay(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function dayStatusOf(hours: number, expected: number): DayStatus {
  if (hours <= 0) return expected > 0 ? 'missing' : 'ok'
  if (expected > 0 && hours + 1e-9 < expected) return 'short'
  return 'ok'
}

// One row per day inside the employment window. Weekends appear only when
// something was logged on them — an empty Sunday is not missing data.
export function buildDayLog(
  from: Date,
  to: Date,
  hoursByDay: Map<string, number>,
  employment: EmploymentPeriod,
  hoursPerDay: number,
  until = new Date()
): DayLogEntry[] {
  const window = employedWindow(from, to, employment, until)
  if (!window) return []

  const out: DayLogEntry[] = []
  const cursor = new Date(
    Date.UTC(window.from.getUTCFullYear(), window.from.getUTCMonth(), window.from.getUTCDate())
  )
  while (cursor <= window.to) {
    const day = cursor.getUTCDay()
    const weekend = day === 0 || day === 6
    const key = isoDay(cursor)
    const hours = hoursByDay.get(key) ?? 0
    if (!weekend || hours > 0) {
      const expected = weekend ? 0 : hoursPerDay
      out.push({ date: key, hours, expected, status: dayStatusOf(hours, expected) })
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
}

/* ─── billable / overhead split ──────────────────────────────── */

export type HoursSplit = {
  total: number
  billableHours: number
  overheadHours: number
  billablePct: number | null
  overheadPct: number | null
}

// Percentages are of the month's own total, so they always add up to 100%.
// A month with no hours has no percentages at all rather than 0% / 0%.
export function hoursSplit(billableHours: number, overheadHours: number): HoursSplit {
  const total = billableHours + overheadHours
  return {
    total,
    billableHours,
    overheadHours,
    billablePct: safeRatio(billableHours, total),
    overheadPct: safeRatio(overheadHours, total),
  }
}

/* ─── client payments ────────────────────────────────────────── */

// Deliberately minimal: what was agreed, what was billed, what came in.
// null means "not recorded", which is different from zero and must stay
// visible as such in the UI.
export type ClientPaymentInfo = {
  invoiced: number | null
  paid: number | null
}

export type PaymentStatus = 'paid' | 'partial' | 'outstanding' | 'unknown'

export function outstandingAmount(invoiced: number | null, paid: number | null): number | null {
  if (invoiced === null) return null
  return Math.max(0, invoiced - (paid ?? 0))
}

export function paymentStatusOf(info: ClientPaymentInfo): PaymentStatus {
  if (info.invoiced === null || info.paid === null) return 'unknown'
  if (info.invoiced <= 0) return 'unknown'
  if (info.paid >= info.invoiced) return 'paid'
  if (info.paid > 0) return 'partial'
  return 'outstanding'
}

/* ─── row shapes shared by builder + UI ──────────────────────── */

export type EmployeeClientSlice = {
  clientId: string
  clientName: string
  billable: boolean
  hours: number
  revenue: number
  laborCost: number
  contribution: number
  revenuePerHour: number | null
}

export type EmployeeRow = {
  id: string
  name: string
  active: boolean
  costPerHour: number
  hours: number
  activeDays: number
  billableHours: number
  nonBillableHours: number
  unbilledHours: number
  // Billable hours ÷ hours worked. One clearly-defined percentage, rather than
  // a second one measured against theoretical availability.
  billableShare: number | null
  revenue: number
  laborCost: number
  contribution: number
  margin: number | null // 0..1
  revenuePerHour: number | null
  targets: {
    utilizationPct: number | null
    monthlyHours: number | null
    monthlyContribution: number | null
  }
  clients: EmployeeClientSlice[]
}

export type ClientEmployeeSlice = {
  employeeId: string
  employeeName: string
  hours: number
  laborCost: number
  revenue: number
}

export type ClientRow = {
  id: string
  name: string
  billable: boolean
  active: boolean
  monthlyRevenue: number
  revenue: number
  hours: number
  laborCost: number
  contribution: number
  margin: number | null
  revenuePerHour: number | null
  health: ClientHealth
  plannedHours: number | null // prorated for the period
  plannedMonthlyHours: number | null
  hoursVariance: number | null // actual − planned
  budgetConsumed: number | null // actual / planned, 0..∞
  employees: ClientEmployeeSlice[]
}

export type WorkforceSummary = {
  hours: number
  billableHours: number
  nonBillableHours: number
  unbilledHours: number
  billableShare: number | null
  revenue: number
  laborCost: number
  contribution: number
  margin: number | null
  revenuePerHour: number | null
  employeeCount: number
  clientCount: number
  activeDays: number // distinct days with entries — powers avg hours/day
}

export type TrendPoint = {
  month: string
  label: string
  revenue: number
  laborCost: number
  contribution: number
}


/* ─── clients needing attention ──────────────────────────────── */

// A short, plainly-worded watch list. Each item states the rule that produced
// it, so the owner can judge it without trusting a black box. Deliberately
// capped and ordered so the dashboard never turns into an alert feed.
export type ClientAttention = {
  clientId: string
  name: string
  reason: string
  tone: 'neutral' | 'warn'
}

export type AttentionInputs = {
  clients: ClientRow[]
  previousHoursByClient: Map<string, number>
  // Margin below this fraction counts as "below target".
  marginTarget?: number
  minHours?: number
  limit?: number
}

const pctLabel = (v: number) => `${Math.round(v * 100)}%`

export function clientsNeedingAttention(input: AttentionInputs): ClientAttention[] {
  const { clients, previousHoursByClient } = input
  const marginTarget = input.marginTarget ?? 0.25
  const minHours = input.minHours ?? 3
  const limit = input.limit ?? 3

  const billable = clients.filter((c) => c.billable && c.hours >= minHours)
  if (billable.length === 0) return []

  // Median, not mean: one very heavy client would otherwise drag the average
  // up far enough to hide itself.
  const sortedHours = billable.map((c) => c.hours).sort((a, b) => a - b)
  const mid = Math.floor(sortedHours.length / 2)
  const typicalHours =
    sortedHours.length % 2 ? sortedHours[mid] : (sortedHours[mid - 1] + sortedHours[mid]) / 2

  const out: Array<ClientAttention & { weight: number }> = []

  for (const c of billable) {
    // 1. Consumes far more time than a typical client.
    if (typicalHours > 0 && c.hours >= typicalHours * 2) {
      const factor = (c.hours / typicalHours).toFixed(1)
      out.push({
        clientId: c.id,
        name: c.name,
        reason: `${c.hours.toFixed(1)}ω αυτή την περίοδο — ${factor}× περισσότερες ώρες από τον τυπικό πελάτη`,
        tone: 'warn',
        weight: c.hours / typicalHours,
      })
      continue
    }

    // 2. Fee does not cover the work.
    if (c.revenue > 0 && c.margin !== null && c.margin < marginTarget) {
      out.push({
        clientId: c.id,
        name: c.name,
        reason: `Περιθώριο ${pctLabel(c.margin)} — κάτω από τον στόχο του ${pctLabel(marginTarget)}`,
        tone: 'warn',
        weight: 2 + (marginTarget - c.margin),
      })
      continue
    }

    // 3. Hours climbing sharply against last period.
    const previous = previousHoursByClient.get(c.id)
    const change = percentChange(c.hours, previous)
    if (change !== null && change >= 0.3) {
      out.push({
        clientId: c.id,
        name: c.name,
        reason: `Οι ώρες αυξήθηκαν ${pctLabel(change)} σε σχέση με την προηγούμενη περίοδο`,
        tone: 'neutral',
        weight: change,
      })
    }
  }

  return out
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((item) => ({ clientId: item.clientId, name: item.name, reason: item.reason, tone: item.tone }))
}
