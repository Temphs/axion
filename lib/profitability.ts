// Pure calculation core for Workforce & Client Profitability.
// No Prisma/Next imports — everything here is unit-testable.
//
// Metric definitions (surfaced as tooltips in the UI):
//   Utilization            = billable hours / all hours entered — the
//                            chargeable share of the time actually logged
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

/* ─── employee rate ──────────────────────────────────────────── */

// Monthly hours an employee is contracted for, falling back to the account
// default. Drives the fully loaded hourly cost.
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

/* ─── utilization ────────────────────────────────────────────── */

export type HourSplit = { billableHours: number; nonBillableHours: number }

// The single definition of utilization, used by every page that reports it:
// billable (non-overhead) hours over every hour entered, overhead included in
// the denominator. It answers "how much of the time we recorded is chargeable
// work". It does not measure how full someone's month is.
export function utilizationOf(hours: HourSplit): number | null {
  return safeRatio(hours.billableHours, hours.billableHours + hours.nonBillableHours)
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

// Whole UTC calendar day a timestamp falls on. Day counts are derived from
// these indices rather than from an elapsed-milliseconds division, so a range
// covers the same number of days no matter what time of day its bounds carry.
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
  // Arbitrary ranges shift back by their own length in whole days, so the
  // comparison window always spans exactly as many days as the current one.
  const days = dayIndex(to) - dayIndex(from) + 1
  return { from: new Date(from.getTime() - days * MS_PER_DAY), to: new Date(from.getTime() - 1) }
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
  // Day-level completeness: which dates were logged, and how many of those days
  // came in under the account's daily target (8h by default).
  firstEntry: string | null // yyyy-mm-dd
  lastEntry: string | null
  incompleteDays: number
  missingHours: number
  billableHours: number
  nonBillableHours: number
  unbilledHours: number
  utilization: number | null // 0..1
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
  utilization: number | null
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
  hours: number
  revenue: number
  laborCost: number
  contribution: number
}

/* ─── deterministic insights ─────────────────────────────────── */

export type Insight = {
  severity: 'critical' | 'warning' | 'info'
  kind: 'client_margin' | 'utilization' | 'budget_overrun' | 'pricing'
  message: string
  href?: string // relative link target (client/employee page)
}

const pctF = (v: number) => `${Math.round(v * 100)}%`
const eurF = (v: number) => `€${Math.round(v).toLocaleString('el-GR')}`

export type InsightInputs = {
  employees: EmployeeRow[]
  clients: ClientRow[]
  previousClients: Map<string, { margin: number | null; hours: number }>
  companyRevenuePerHour: number | null
  defaultUtilizationTarget: number // fraction, e.g. 0.75
  periodElapsedFraction: number // how much of the period has passed (1 for closed periods)
}

// Rule-based management alerts. Every message is backed by the numbers shown.
export function computeInsights(input: InsightInputs): Insight[] {
  const out: Insight[] = []

  // Client margin deterioration vs previous period (≥10 percentage points).
  for (const c of input.clients) {
    if (!c.billable || c.revenue <= 0 || c.margin === null) continue
    const prev = input.previousClients.get(c.id)
    if (!prev || prev.margin === null) continue
    const drop = prev.margin - c.margin
    if (drop >= 0.1) {
      const hoursChange = prev.hours > 0 ? (c.hours - prev.hours) / prev.hours : null
      const cause =
        hoursChange !== null && hoursChange > 0.1
          ? ` — οι ώρες εργασίας αυξήθηκαν κατά ${pctF(hoursChange)}`
          : ''
      out.push({
        severity: c.margin < 0.2 ? 'critical' : 'warning',
        kind: 'client_margin',
        message: `Το περιθώριο του «${c.name}» έπεσε από ${pctF(prev.margin)} σε ${pctF(c.margin)}${cause}.`,
        href: `clients/${c.id}`,
      })
    }
  }

  // Utilization below target.
  for (const e of input.employees) {
    if (!e.active || e.utilization === null || e.hours === 0) continue
    const target = e.targets.utilizationPct != null ? e.targets.utilizationPct / 100 : input.defaultUtilizationTarget
    if (e.utilization < target * 0.8) {
      out.push({
        severity: 'warning',
        kind: 'utilization',
        message: `Οι χρεώσιμες ώρες του/της ${e.name} είναι ${pctF(e.utilization)} του καταγεγραμμένου χρόνου, έναντι στόχου ${pctF(target)}.`,
        href: `employees/${e.id}`,
      })
    }
  }

  // Budget overruns (only meaningful while a period is running or closed).
  for (const c of input.clients) {
    if (c.plannedHours === null || c.plannedHours <= 0 || c.budgetConsumed === null) continue
    if (c.budgetConsumed >= 1) {
      out.push({
        severity: 'critical',
        kind: 'budget_overrun',
        message: `Ο «${c.name}» έχει υπερβεί τις προγραμματισμένες ώρες: ${c.hours.toFixed(0)}ω έναντι ${c.plannedHours.toFixed(0)}ω (${pctF(c.budgetConsumed)}).`,
        href: `clients/${c.id}`,
      })
    } else if (c.budgetConsumed >= 0.85 && input.periodElapsedFraction < 0.9) {
      out.push({
        severity: 'warning',
        kind: 'budget_overrun',
        message: `Ο «${c.name}» έχει καταναλώσει το ${pctF(c.budgetConsumed)} των προγραμματισμένων ωρών ενώ έχει διανυθεί το ${pctF(input.periodElapsedFraction)} της περιόδου.`,
        href: `clients/${c.id}`,
      })
    }
  }

  // Pricing: revenue/hour far below company average.
  if (input.companyRevenuePerHour !== null && input.companyRevenuePerHour > 0) {
    for (const c of input.clients) {
      if (!c.billable || c.hours < 5 || c.revenuePerHour === null) continue
      if (c.revenuePerHour < input.companyRevenuePerHour * 0.6) {
        out.push({
          severity: 'info',
          kind: 'pricing',
          message: `Ο «${c.name}» αποδίδει ${eurF(c.revenuePerHour)}/ώρα έναντι μέσου όρου εταιρείας ${eurF(input.companyRevenuePerHour)}/ώρα.`,
          href: `clients/${c.id}`,
        })
      }
    }
  }

  const order = { critical: 0, warning: 1, info: 2 }
  return out.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 8)
}

/* ─── repricing candidates ───────────────────────────────────── */

export type PricingOpportunity = {
  clientId: string
  name: string
  revenue: number
  hours: number
  revenuePerHour: number | null
  companyRevenuePerHour: number | null
  margin: number | null
  reasons: string[]
}

export function findPricingOpportunities(
  clients: ClientRow[],
  companyRevenuePerHour: number | null,
  minHours = 5
): PricingOpportunity[] {
  const out: PricingOpportunity[] = []
  for (const c of clients) {
    if (!c.billable || c.hours < minHours) continue
    const reasons: string[] = []
    if (c.revenue <= 0) reasons.push('Δεν έχει οριστεί έσοδο παρότι καταναλώνει ώρες')
    if (c.margin !== null && c.margin < 0.2) reasons.push(`Περιθώριο ${pctF(c.margin)}`)
    if (
      companyRevenuePerHour !== null &&
      companyRevenuePerHour > 0 &&
      c.revenuePerHour !== null &&
      c.revenuePerHour < companyRevenuePerHour * 0.6
    ) {
      reasons.push(`${eurF(c.revenuePerHour)}/ώρα έναντι μ.ό. ${eurF(companyRevenuePerHour)}/ώρα`)
    }
    if (c.budgetConsumed !== null && c.budgetConsumed > 1) reasons.push('Υπέρβαση προγραμματισμένων ωρών')
    if (reasons.length > 0) {
      out.push({
        clientId: c.id,
        name: c.name,
        revenue: c.revenue,
        hours: c.hours,
        revenuePerHour: c.revenuePerHour,
        companyRevenuePerHour,
        margin: c.margin,
        reasons,
      })
    }
  }
  return out.sort((a, b) => (a.margin ?? -1) - (b.margin ?? -1)).slice(0, 6)
}
