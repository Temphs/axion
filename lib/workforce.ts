import { prisma } from '@/lib/db'
import { getSettings, hoursPerMonth } from '@/lib/settings'
import {
  allocateProRata,
  capacityStatus,
  clientHealth,
  computeInsights,
  costPerHourFor,
  findPricingOpportunities,
  monthCoverage,
  monthKeyOf,
  monthlyHoursFor,
  previousPeriodOf,
  safeRatio,
  utilizationOf,
  type CapacityRow,
  type ClientRow,
  type EmployeeRow,
  type Insight,
  type PricingOpportunity,
  type TrendPoint,
  type WorkforceSummary,
} from '@/lib/profitability'

// Server-side builder: one aggregated query window feeds the current period,
// the previous period (for deltas) and the 6-month trend. All business math
// lives in lib/profitability.ts.

export type Workforce = {
  period: { from: string; to: string; months: number; elapsedFraction: number; all: boolean }
  summary: WorkforceSummary
  previousSummary: WorkforceSummary | null
  employees: EmployeeRow[]
  clients: ClientRow[]
  trend: TrendPoint[]
  insights: Insight[]
  capacity: CapacityRow[]
  pricing: PricingOpportunity[]
  companyRevenuePerHour: number | null
  hoursPerMonth: number
}

type PairRow = { employeeId: string; clientId: string; date: Date; hours: number }

type EmployeeInfo = {
  id: string
  name: string
  active: boolean
  monthlyCost: number
  contractHoursPerMonth: number | null
  targetUtilizationPct: number | null
  targetMonthlyHours: number | null
  targetMonthlyContribution: number | null
}

type ClientInfo = {
  id: string
  name: string
  billable: boolean
  active: boolean
  monthlyRevenue: number
  plannedMonthlyHours: number | null
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('el-GR', { month: 'short', year: '2-digit' }).format(new Date(Date.UTC(y, m - 1, 1)))
}

function startOfUtcMonth(d: Date, offsetMonths = 0): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offsetMonths, 1))
}

function endOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999))
}

// Default reporting period: the current calendar month to date.
export function defaultPeriod(now = new Date()): { from: Date; to: Date } {
  return { from: startOfUtcMonth(now), to: now }
}

/* ─── per-period aggregation ─────────────────────────────────── */

type PeriodStats = {
  employees: EmployeeRow[]
  clients: ClientRow[]
  summary: WorkforceSummary
}

function computePeriodStats(
  rows: PairRow[],
  from: Date,
  to: Date,
  employees: EmployeeInfo[],
  clients: ClientInfo[],
  hpm: number,
  activeMonthsOnly = false
): PeriodStats {
  // "All history" mode counts only months that actually have entries, so long
  // gaps don't dilute utilization or inflate prorated revenue/planned hours.
  let coverage: Map<string, number>
  if (activeMonthsOnly) {
    coverage = new Map()
    for (const row of rows) {
      if (row.date < from || row.date > to) continue
      coverage.set(monthKeyOf(row.date), 1)
    }
  } else {
    coverage = monthCoverage(from, to)
  }
  let monthsF = 0
  for (const f of coverage.values()) monthsF += f
  // Whole calendar months the period touches — used for month-granular budgets.
  const budgetMonths = coverage.size

  const empInfo = new Map(employees.map((e) => [e.id, e]))
  const cliInfo = new Map(clients.map((c) => [c.id, c]))
  // Contracted hours drive both capacity and the hourly rate, so a part-timer
  // is measured against their own contract, not the company-wide default.
  const monthlyHoursOf = (e: EmployeeInfo) => monthlyHoursFor(e, hpm)
  const rate = (e: EmployeeInfo) => costPerHourFor(e, hpm)

  // client → month → employee → hours (drives revenue attribution)
  const clientMonthEmp = new Map<string, Map<string, Map<string, number>>>()
  // employee → client → {hours, cost}
  const empClient = new Map<string, Map<string, { hours: number; cost: number }>>()
  // distinct working days, overall and per employee (for avg hours/day)
  const allDays = new Set<number>()
  const empDays = new Map<string, Set<number>>()
  // per-employee active months — in all-history mode each employee's
  // available hours count only the months they actually worked
  const empMonths = new Map<string, Set<string>>()

  for (const row of rows) {
    if (row.date < from || row.date > to) continue
    const emp = empInfo.get(row.employeeId)
    const cli = cliInfo.get(row.clientId)
    if (!emp || !cli) continue

    const dayKey = Math.floor(row.date.getTime() / 86_400_000)
    allDays.add(dayKey)
    let days = empDays.get(emp.id)
    if (!days) empDays.set(emp.id, (days = new Set()))
    days.add(dayKey)

    const mk = monthKeyOf(row.date)
    let months = empMonths.get(emp.id)
    if (!months) empMonths.set(emp.id, (months = new Set()))
    months.add(mk)
    let byMonth = clientMonthEmp.get(cli.id)
    if (!byMonth) clientMonthEmp.set(cli.id, (byMonth = new Map()))
    let byEmp = byMonth.get(mk)
    if (!byEmp) byMonth.set(mk, (byEmp = new Map()))
    byEmp.set(emp.id, (byEmp.get(emp.id) ?? 0) + row.hours)

    let ec = empClient.get(emp.id)
    if (!ec) empClient.set(emp.id, (ec = new Map()))
    const slice = ec.get(cli.id) ?? { hours: 0, cost: 0 }
    slice.hours += row.hours
    slice.cost += row.hours * rate(emp)
    ec.set(cli.id, slice)
  }

  // Revenue attribution: per client-month, monthlyRevenue × month coverage,
  // allocated pro-rata to the employees who logged hours on it that month.
  const empRevenue = new Map<string, number>() // employeeId → €
  const empClientRevenue = new Map<string, number>() // `${empId}:${cliId}` → €
  const clientRevenue = new Map<string, number>()

  for (const [clientId, byMonth] of clientMonthEmp) {
    const cli = cliInfo.get(clientId)!
    if (!cli.billable || cli.monthlyRevenue <= 0) continue
    for (const [mk, byEmp] of byMonth) {
      const monthRevenue = cli.monthlyRevenue * (coverage.get(mk) ?? 0)
      if (monthRevenue <= 0) continue
      clientRevenue.set(clientId, (clientRevenue.get(clientId) ?? 0) + monthRevenue)
      for (const [empId, share] of allocateProRata(monthRevenue, byEmp)) {
        empRevenue.set(empId, (empRevenue.get(empId) ?? 0) + share)
        const key = `${empId}:${clientId}`
        empClientRevenue.set(key, (empClientRevenue.get(key) ?? 0) + share)
      }
    }
  }

  /* employee rows */
  const employeeRows: EmployeeRow[] = employees.map((e) => {
    const slices = empClient.get(e.id)
    let hours = 0
    let billableHours = 0
    let nonBillableHours = 0
    let unbilledHours = 0
    let laborCost = 0
    const clientsOut: EmployeeRow['clients'] = []
    if (slices) {
      for (const [clientId, s] of slices) {
        const cli = cliInfo.get(clientId)!
        hours += s.hours
        laborCost += s.cost
        if (cli.billable) billableHours += s.hours
        else nonBillableHours += s.hours
        if (!cli.billable || cli.monthlyRevenue <= 0) unbilledHours += s.hours
        const rev = empClientRevenue.get(`${e.id}:${clientId}`) ?? 0
        clientsOut.push({
          clientId,
          clientName: cli.name,
          billable: cli.billable,
          hours: s.hours,
          revenue: rev,
          laborCost: s.cost,
          contribution: rev - s.cost,
          revenuePerHour: safeRatio(rev, s.hours),
        })
      }
      clientsOut.sort((a, b) => b.hours - a.hours)
    }
    const revenue = empRevenue.get(e.id) ?? 0
    // All-history mode: each employee is measured against the months they
    // actually worked, so joiners/leavers aren't diluted by company-wide span.
    const monthsForEmployee = activeMonthsOnly ? (empMonths.get(e.id)?.size ?? 0) : monthsF
    const available = monthlyHoursOf(e) * monthsForEmployee
    return {
      id: e.id,
      name: e.name,
      active: e.active,
      costPerHour: rate(e),
      hours,
      activeDays: empDays.get(e.id)?.size ?? 0,
      billableHours,
      nonBillableHours,
      unbilledHours,
      availableHours: available,
      utilization: utilizationOf({ billableHours, nonBillableHours }),
      revenue,
      laborCost,
      contribution: revenue - laborCost,
      margin: safeRatio(revenue - laborCost, revenue),
      revenuePerHour: safeRatio(revenue, billableHours),
      targets: {
        utilizationPct: e.targetUtilizationPct,
        monthlyHours: e.targetMonthlyHours,
        monthlyContribution: e.targetMonthlyContribution,
      },
      clients: clientsOut,
    }
  })

  /* client rows */
  const clientRows: ClientRow[] = []
  for (const cli of clients) {
    const byMonth = clientMonthEmp.get(cli.id)
    if (!byMonth) continue // only clients with activity in the period
    let hours = 0
    let laborCost = 0
    const perEmp = new Map<string, { hours: number; cost: number }>()
    for (const byEmp of byMonth.values()) {
      for (const [empId, h] of byEmp) {
        const emp = empInfo.get(empId)!
        hours += h
        const cost = h * rate(emp)
        laborCost += cost
        const s = perEmp.get(empId) ?? { hours: 0, cost: 0 }
        s.hours += h
        s.cost += cost
        perEmp.set(empId, s)
      }
    }
    const revenue = clientRevenue.get(cli.id) ?? 0
    const margin = safeRatio(revenue - laborCost, revenue)
    // Budgets are whole-month commitments: a period that touches 1 calendar
    // month is compared against 1× the monthly budget, even mid-month. (Prorating
    // it would show "43ω από 12,9ω" to someone who configured 25ω/μήνα.)
    const plannedHours = cli.plannedMonthlyHours != null ? cli.plannedMonthlyHours * budgetMonths : null
    clientRows.push({
      id: cli.id,
      name: cli.name,
      billable: cli.billable,
      active: cli.active,
      monthlyRevenue: cli.monthlyRevenue,
      revenue,
      hours,
      laborCost,
      contribution: revenue - laborCost,
      margin,
      revenuePerHour: safeRatio(revenue, hours),
      health: clientHealth(margin, cli.billable, revenue > 0),
      plannedHours,
      plannedMonthlyHours: cli.plannedMonthlyHours,
      hoursVariance: plannedHours !== null ? hours - plannedHours : null,
      budgetConsumed: plannedHours !== null && plannedHours > 0 ? hours / plannedHours : null,
      employees: [...perEmp.entries()]
        .map(([empId, s]) => ({
          employeeId: empId,
          employeeName: empInfo.get(empId)?.name ?? '—',
          hours: s.hours,
          laborCost: s.cost,
          revenue: empClientRevenue.get(`${empId}:${cli.id}`) ?? 0,
        }))
        .sort((a, b) => b.hours - a.hours),
    })
  }
  clientRows.sort((a, b) => b.revenue - a.revenue || b.hours - a.hours)

  /* summary */
  const withHours = employeeRows.filter((e) => e.hours > 0)
  const totals = withHours.reduce(
    (s, e) => {
      s.hours += e.hours
      s.billable += e.billableHours
      s.nonBillable += e.nonBillableHours
      s.unbilled += e.unbilledHours
      s.revenue += e.revenue
      s.cost += e.laborCost
      return s
    },
    { hours: 0, billable: 0, nonBillable: 0, unbilled: 0, revenue: 0, cost: 0 }
  )
  // Team availability is the sum of each employee's own capacity, so differing
  // contracts (and, in all-history mode, differing active months) are reflected
  // instead of assuming everyone is full-time. Leavers who logged hours in the
  // period are counted too: their hours are in the numerator, so omitting their
  // capacity would push utilization above 100%.
  const countedIds = new Set(employees.filter((e) => e.active).map((e) => e.id))
  for (const e of withHours) countedIds.add(e.id)
  const availableTotal = employeeRows
    .filter((e) => countedIds.has(e.id))
    .reduce((s, e) => s + e.availableHours, 0)

  const summary: WorkforceSummary = {
    hours: totals.hours,
    billableHours: totals.billable,
    nonBillableHours: totals.nonBillable,
    unbilledHours: totals.unbilled,
    availableHours: availableTotal,
    utilization: utilizationOf({ billableHours: totals.billable, nonBillableHours: totals.nonBillable }),
    revenue: totals.revenue,
    laborCost: totals.cost,
    contribution: totals.revenue - totals.cost,
    margin: safeRatio(totals.revenue - totals.cost, totals.revenue),
    revenuePerHour: safeRatio(totals.revenue, totals.billable),
    employeeCount: withHours.length,
    clientCount: clientRows.length,
    activeDays: allDays.size,
  }

  return { employees: employeeRows, clients: clientRows, summary }
}

/* ─── the public builder ─────────────────────────────────────── */

export async function buildWorkforce(
  userId: string,
  opts: { from?: Date; to?: Date; all?: boolean } = {},
  now = new Date()
): Promise<Workforce> {
  // Period resolution:
  //  - all: first → last recorded entry, counting only months with entries
  //  - explicit from/to: as given
  //  - default: current month, or the latest month with entries when the
  //    account's data ends earlier (e.g. imported history)
  let from = opts.from
  let to = opts.to
  const allMode = !!opts.all
  if (allMode) {
    const bounds = await prisma.workEntry.aggregate({ where: { userId }, _min: { date: true }, _max: { date: true } })
    const min = bounds._min.date
    const max = bounds._max.date
    if (min && max) {
      from = startOfUtcMonth(min)
      to = endOfUtcMonth(max)
    }
  }
  if (!from && !to) {
    const fallback = defaultPeriod(now)
    const latest = await prisma.workEntry.aggregate({ where: { userId }, _max: { date: true } })
    const latestDate = latest._max.date
    if (latestDate && latestDate < fallback.from) {
      from = startOfUtcMonth(latestDate)
      to = endOfUtcMonth(latestDate)
    } else {
      from = fallback.from
      to = fallback.to
    }
  } else {
    const fallback = defaultPeriod(now)
    from = from ?? fallback.from
    to = to ?? fallback.to
  }
  const prev = previousPeriodOf(from, to)
  const trendStart = startOfUtcMonth(to, -5)
  // "All history" has no previous period to compare against, so its window must
  // not be stretched back by another full span of the account's history.
  const earliestNeeded = allMode ? from : prev.from
  const windowStart = earliestNeeded < trendStart ? earliestNeeded : trendStart
  const windowEnd = endOfUtcMonth(to) > to ? endOfUtcMonth(to) : to

  const settings = await getSettings(userId)
  const hpm = hoursPerMonth(settings)

  const [groups, employees, clients] = await Promise.all([
    prisma.workEntry.groupBy({
      by: ['employeeId', 'clientId', 'date'],
      where: { userId, date: { gte: windowStart, lte: windowEnd } },
      _sum: { minutes: true },
    }),
    prisma.employee.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        active: true,
        monthlyCost: true,
        contractHoursPerMonth: true,
        targetUtilizationPct: true,
        targetMonthlyHours: true,
        targetMonthlyContribution: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.client.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        billable: true,
        active: true,
        monthlyRevenue: true,
        plannedMonthlyHours: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  const rows: PairRow[] = groups.map((g) => ({
    employeeId: g.employeeId,
    clientId: g.clientId,
    date: g.date,
    hours: (g._sum.minutes ?? 0) / 60,
  }))

  const current = computePeriodStats(rows, from, to, employees, clients, hpm, allMode)
  const previousStats = allMode ? null : computePeriodStats(rows, prev.from, prev.to, employees, clients, hpm)
  const hasPrevious = previousStats !== null && previousStats.summary.hours > 0

  /* trend: months ending at month(to) — in all-mode only months with entries
     (most recent 12); otherwise the last 6 calendar months */
  const empInfo = new Map(employees.map((e) => [e.id, e]))
  const cliInfo = new Map(clients.map((c) => [c.id, c]))
  // Same fully-loaded rate the KPI cards and tables use — a part-timer's salary
  // is spread over their own contracted hours, not the account default.
  const trendRate = new Map(employees.map((e) => [e.id, costPerHourFor(e, hpm)]))

  let trendMonths: Date[]
  if (allMode) {
    const activeMonths = new Set<string>()
    for (const row of rows) {
      if (row.date >= from && row.date <= to) activeMonths.add(monthKeyOf(row.date))
    }
    trendMonths = [...activeMonths]
      .sort()
      .slice(-12)
      .map((mk) => {
        const [y, m] = mk.split('-').map(Number)
        return new Date(Date.UTC(y, m - 1, 1))
      })
  } else {
    trendMonths = []
    for (let i = 5; i >= 0; i--) trendMonths.push(startOfUtcMonth(to, -i))
  }

  const trend: TrendPoint[] = []
  for (const mStart of trendMonths) {
    const mEnd = endOfUtcMonth(mStart)
    const mk = monthKeyOf(mStart)
    // in-progress months prorate revenue by elapsed days
    const isCurrent = monthKeyOf(now) === mk
    const fraction = isCurrent ? Math.min(1, now.getUTCDate() / mEnd.getUTCDate()) : 1

    let cost = 0
    let hours = 0
    const activeClients = new Set<string>()
    for (const row of rows) {
      if (row.date < mStart || row.date > mEnd) continue
      const emp = empInfo.get(row.employeeId)
      if (!emp) continue
      hours += row.hours
      cost += row.hours * (trendRate.get(emp.id) ?? 0)
      activeClients.add(row.clientId)
    }
    let revenue = 0
    for (const clientId of activeClients) {
      const cli = cliInfo.get(clientId)
      if (cli?.billable && cli.monthlyRevenue > 0) revenue += cli.monthlyRevenue * fraction
    }
    trend.push({ month: mk, label: monthLabel(mk), hours, revenue, laborCost: cost, contribution: revenue - cost })
  }

  /* capacity (active employees, current period) */
  const capacity: CapacityRow[] = current.employees
    .filter((e) => e.active)
    .map((e) => {
      const allocation = safeRatio(e.hours, e.availableHours)
      return {
        id: e.id,
        name: e.name,
        availableHours: e.availableHours,
        allocatedHours: e.hours,
        remainingHours: Math.max(0, e.availableHours - e.hours),
        allocation,
        status: capacityStatus(allocation),
      }
    })
    .sort((a, b) => (b.allocation ?? 0) - (a.allocation ?? 0))

  // How far through the period we are. Measured against the end of the last
  // calendar month the period touches — the same window `plannedHours` budgets
  // against — so a month-to-date view reports ~50% mid-month instead of 100%
  // (with `to` pinned to now, dividing by `to − from` always yielded 1 and the
  // budget-pacing alert could never fire).
  const budgetWindowEnd = endOfUtcMonth(to)
  const elapsedSpan = Math.max(1, budgetWindowEnd.getTime() - from.getTime())
  const elapsedFraction = Math.max(0, Math.min(1, (now.getTime() - from.getTime()) / elapsedSpan))

  let insights = computeInsights({
    employees: current.employees,
    clients: current.clients,
    previousClients: new Map((previousStats?.clients ?? []).map((c) => [c.id, { margin: c.margin, hours: c.hours }])),
    capacity,
    companyRevenuePerHour: current.summary.revenuePerHour,
    defaultUtilizationTarget: 0.75,
    periodElapsedFraction: elapsedFraction,
  })
  // Utilization/capacity targets are monthly concepts — meaningless across
  // a multi-year "all history" window.
  if (allMode) insights = insights.filter((i) => i.kind !== 'utilization' && i.kind !== 'capacity')

  const pricing = findPricingOpportunities(current.clients, current.summary.revenuePerHour)

  let monthsF = 0
  if (allMode) {
    const activeMonths = new Set<string>()
    for (const row of rows) if (row.date >= from && row.date <= to) activeMonths.add(monthKeyOf(row.date))
    monthsF = activeMonths.size
  } else {
    for (const f of monthCoverage(from, to).values()) monthsF += f
  }

  return {
    period: { from: from.toISOString(), to: to.toISOString(), months: monthsF, elapsedFraction, all: allMode },
    summary: current.summary,
    previousSummary: hasPrevious ? previousStats!.summary : null,
    employees: current.employees,
    clients: current.clients,
    trend,
    insights,
    capacity,
    pricing,
    companyRevenuePerHour: current.summary.revenuePerHour,
    hoursPerMonth: hpm,
  }
}

// Monthly profitability trend for a single client (client detail page).
// With a from/to range: all calendar months intersecting it (max 12).
// Without: the last 6 months up to now.
export async function buildClientProfitTrend(
  userId: string,
  clientId: string,
  opts: { from?: Date; to?: Date; all?: boolean } = {},
  now = new Date()
): Promise<TrendPoint[]> {
  const settings = await getSettings(userId)
  const hpm = hoursPerMonth(settings)

  // Without an explicit range, anchor on the client's own latest activity so
  // dormant/historical clients still show their last active months.
  let anchor = opts.to
  if (!anchor) {
    const latest = await prisma.workEntry.aggregate({ where: { userId, clientId }, _max: { date: true } })
    anchor = latest._max.date && latest._max.date < now ? latest._max.date : now
  }
  let months = opts.all ? 12 : 6
  if (opts.from) {
    const span =
      (anchor.getUTCFullYear() - opts.from.getUTCFullYear()) * 12 + (anchor.getUTCMonth() - opts.from.getUTCMonth()) + 1
    months = Math.max(1, Math.min(12, span))
  }
  const start = startOfUtcMonth(anchor, -(months - 1))

  const [client, groups, employees] = await Promise.all([
    prisma.client.findFirst({ where: { id: clientId, userId } }),
    prisma.workEntry.groupBy({
      by: ['employeeId', 'date'],
      where: { userId, clientId, date: { gte: start } },
      _sum: { minutes: true },
    }),
    prisma.employee.findMany({ where: { userId }, select: { id: true, monthlyCost: true, contractHoursPerMonth: true } }),
  ])
  if (!client) return []
  const rate = new Map(employees.map((e) => [e.id, costPerHourFor(e, hpm)]))

  const costByMonth = new Map<string, number>()
  const hoursByMonth = new Map<string, number>()
  const activityByMonth = new Set<string>()
  for (const g of groups) {
    const mk = monthKeyOf(g.date)
    const hours = (g._sum.minutes ?? 0) / 60
    costByMonth.set(mk, (costByMonth.get(mk) ?? 0) + hours * (rate.get(g.employeeId) ?? 0))
    hoursByMonth.set(mk, (hoursByMonth.get(mk) ?? 0) + hours)
    activityByMonth.add(mk)
  }

  const out: TrendPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const mStart = startOfUtcMonth(anchor, -i)
    const mk = monthKeyOf(mStart)
    const isCurrent = monthKeyOf(now) === mk
    const fraction = isCurrent ? Math.min(1, now.getUTCDate() / endOfUtcMonth(mStart).getUTCDate()) : 1
    const revenue =
      client.billable && client.monthlyRevenue > 0 && activityByMonth.has(mk) ? client.monthlyRevenue * fraction : 0
    const cost = costByMonth.get(mk) ?? 0
    out.push({
      month: mk,
      label: monthLabel(mk),
      hours: hoursByMonth.get(mk) ?? 0,
      revenue,
      laborCost: cost,
      contribution: revenue - cost,
    })
  }
  // "All history": show only months where the client actually had activity.
  if (opts.all) return out.filter((p) => p.revenue !== 0 || p.laborCost !== 0)
  return out
}
