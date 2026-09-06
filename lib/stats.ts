import { prisma } from '@/lib/db'
import { getSettings, hoursPerMonth } from '@/lib/settings'
import { costPerHourFor, monthsInPeriod, safeRatio, utilizationOf } from '@/lib/profitability'

export type StatsFilter = {
  from?: Date
  to?: Date
  employeeId?: string
  clientId?: string
}

export type EmployeeStat = {
  id: string
  name: string
  hours: number
  cost: number
  clients: { id: string; name: string; hours: number; cost: number }[]
}

export type ClientStat = {
  id: string
  name: string
  billable: boolean
  monthlyRevenue: number
  hours: number
  cost: number
  revenue: number
  profit: number
  margin: number | null
  revenuePerHour: number
}

export type StatsSummary = {
  hours: number
  cost: number
  revenue: number
  profit: number
  billableHours: number
  nonBillableHours: number
  entryCount: number
  employeeCount: number
  clientCount: number
  utilization: number | null
}

export type Stats = {
  range: { from: string | null; to: string | null; months: number }
  settings: { hoursPerDay: number; daysPerMonth: number; hoursPerMonth: number; includeOverhead: boolean }
  summary: StatsSummary
  employees: EmployeeStat[]
  clients: ClientStat[]
}

// Length of a range in months, by calendar coverage: a full calendar month is
// exactly 1 whether it has 28 or 31 days. Shared with the workforce page so the
// same range prorates monthly revenue to the same figure on both.
function monthsBetween(from: Date, to: Date): number {
  return monthsInPeriod(from, to)
}

// Parse ?from=&to=&employeeId=&clientId= from a request URL. A bare yyyy-mm-dd `to`
// is widened to end-of-day so the range is inclusive of that calendar day.
export function parseStatsFilter(searchParams: URLSearchParams): { filter: StatsFilter } | { error: string } {
  const filter: StatsFilter = {}

  const from = searchParams.get('from')
  if (from) {
    const d = new Date(from)
    if (Number.isNaN(d.getTime())) return { error: 'invalid "from" date' }
    filter.from = d
  }
  const to = searchParams.get('to')
  if (to) {
    const d = new Date(to)
    if (Number.isNaN(d.getTime())) return { error: 'invalid "to" date' }
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) d.setUTCHours(23, 59, 59, 999)
    filter.to = d
  }

  const employeeId = searchParams.get('employeeId')
  if (employeeId) filter.employeeId = employeeId
  const clientId = searchParams.get('clientId')
  if (clientId) filter.clientId = clientId

  return { filter }
}

export async function buildStats(userId: string, filter: StatsFilter): Promise<Stats> {
  const settings = await getSettings(userId)
  const hpm = hoursPerMonth(settings)

  const where: Record<string, unknown> = { userId }
  if (filter.employeeId) where.employeeId = filter.employeeId
  if (filter.clientId) where.clientId = filter.clientId
  const dateFilter: Record<string, Date> = {}
  if (filter.from) dateFilter.gte = filter.from
  if (filter.to) dateFilter.lte = filter.to
  if (Object.keys(dateFilter).length) where.date = dateFilter

  // Aggregate in the database instead of pulling every row. Grouping by
  // (employee, client) collapses thousands of entries into at most a few hundred
  // pair rows, and the date bounds + count come back in one cheap aggregate.
  const [pairGroups, bounds, employeeRows, clientRows] = await Promise.all([
    prisma.workEntry.groupBy({ by: ['employeeId', 'clientId'], where, _sum: { minutes: true } }),
    prisma.workEntry.aggregate({ where, _min: { date: true }, _max: { date: true }, _count: { _all: true } }),
    prisma.employee.findMany({ where: { userId }, select: { id: true, name: true, active: true, monthlyCost: true, contractHoursPerMonth: true } }),
    prisma.client.findMany({ where: { userId }, select: { id: true, name: true, billable: true, monthlyRevenue: true } }),
  ])
  const empInfo = new Map(employeeRows.map((e) => [e.id, e]))
  const cliInfo = new Map(clientRows.map((c) => [c.id, c]))

  // Effective range: explicit bounds, else the span of the matched entries.
  const from = filter.from ?? bounds._min.date ?? null
  const to = filter.to ?? bounds._max.date ?? null
  const months = from && to ? monthsBetween(from, to) : 0


  const employeeMap = new Map<string, EmployeeStat>()
  const clientMap = new Map<string, ClientStat>()
  let billableHours = 0
  let nonBillableHours = 0

  for (const g of pairGroups) {
    const emp = empInfo.get(g.employeeId)
    const cli = cliInfo.get(g.clientId)
    if (!emp || !cli) continue
    const hours = (g._sum.minutes ?? 0) / 60
    const cost = hours * costPerHourFor(emp, hpm)
    if (cli.billable) billableHours += hours
    else nonBillableHours += hours

    // Per employee, with a per-client breakdown. Each pair appears once, so the
    // client can be pushed directly without a lookup.
    let empStat = employeeMap.get(g.employeeId)
    if (!empStat) {
      empStat = { id: emp.id, name: emp.name, hours: 0, cost: 0, clients: [] }
      employeeMap.set(g.employeeId, empStat)
    }
    empStat.hours += hours
    empStat.cost += cost
    empStat.clients.push({ id: cli.id, name: cli.name, hours, cost })

    // Per client.
    let cliStat = clientMap.get(g.clientId)
    if (!cliStat) {
      cliStat = {
        id: cli.id,
        name: cli.name,
        billable: cli.billable,
        monthlyRevenue: cli.monthlyRevenue,
        hours: 0,
        cost: 0,
        revenue: 0,
        profit: 0,
        margin: null,
        revenuePerHour: 0,
      }
      clientMap.set(g.clientId, cliStat)
    }
    cliStat.hours += hours
    cliStat.cost += cost
  }

  // Finalize per-client revenue/profit/ROI using the prorated revenue for the range.
  for (const cli of clientMap.values()) {
    cli.revenue = cli.billable ? cli.monthlyRevenue * months : 0
    cli.profit = cli.revenue - cli.cost
    cli.margin = safeRatio(cli.profit, cli.revenue)
    cli.revenuePerHour = cli.hours > 0 ? cli.revenue / cli.hours : 0
  }

  const clients = [...clientMap.values()].sort((a, b) => b.hours - a.hours)
  const employees = [...employeeMap.values()].sort((a, b) => b.hours - a.hours)
  for (const emp of employees) emp.clients.sort((a, b) => b.hours - a.hours)

  // Summary. When includeOverhead is off, non-billable (overhead) clients are excluded from the totals.
  const summaryClients = settings.includeOverhead ? clients : clients.filter((c) => c.billable)
  const summaryHours = summaryClients.reduce((s, c) => s + c.hours, 0)
  const summaryCost = summaryClients.reduce((s, c) => s + c.cost, 0)
  const summaryRevenue = summaryClients.reduce((s, c) => s + c.revenue, 0)

  const summary: StatsSummary = {
    hours: summaryHours,
    cost: summaryCost,
    revenue: summaryRevenue,
    profit: summaryRevenue - summaryCost,
    billableHours,
    nonBillableHours,
    entryCount: bounds._count._all,
    employeeCount: employeeMap.size,
    clientCount: clientMap.size,
    utilization: utilizationOf({ billableHours, nonBillableHours }),
  }

  return {
    range: {
      from: from ? from.toISOString() : null,
      to: to ? to.toISOString() : null,
      months,
    },
    settings: {
      hoursPerDay: settings.hoursPerDay,
      daysPerMonth: settings.daysPerMonth,
      hoursPerMonth: hpm,
      includeOverhead: settings.includeOverhead,
    },
    summary,
    employees,
    clients,
  }
}

// --- Employee analytics ---------------------------------------------------

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('el-GR', { month: 'short', year: '2-digit' }).format(
    new Date(Date.UTC(y, m - 1, 1))
  )
}

export type EmployeeOverview = {
  id: string
  name: string
  notes: string | null
  active: boolean
  monthlyCost: number
  costPerHour: number
  hours: number
  days: number
  months: number
  avgPerDay: number
  avgPerMonth: number
  utilization: number | null
  billableHours: number
  nonBillableHours: number
  cost: number
}

// Per-employee headline metrics for the cards grid. Aggregated in the database.
export async function getEmployeesOverview(userId: string): Promise<EmployeeOverview[]> {
  const settings = await getSettings(userId)
  const hpm = hoursPerMonth(settings)

  const [employees, dayGroups, clientGroups, clients] = await Promise.all([
    prisma.employee.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.workEntry.groupBy({ by: ['employeeId', 'date'], where: { userId }, _sum: { minutes: true } }),
    prisma.workEntry.groupBy({ by: ['employeeId', 'clientId'], where: { userId }, _sum: { minutes: true } }),
    prisma.client.findMany({ where: { userId }, select: { id: true, billable: true } }),
  ])
  const billableOf = new Map(clients.map((c) => [c.id, c.billable]))

  type Agg = { minutes: number; days: number; months: Set<string>; billable: number; nonBillable: number }
  const agg = new Map<string, Agg>()
  const get = (id: string): Agg => {
    let a = agg.get(id)
    if (!a) {
      a = { minutes: 0, days: 0, months: new Set(), billable: 0, nonBillable: 0 }
      agg.set(id, a)
    }
    return a
  }

  for (const g of dayGroups) {
    const a = get(g.employeeId)
    a.minutes += g._sum.minutes ?? 0
    a.days += 1
    a.months.add(monthKey(g.date))
  }
  for (const g of clientGroups) {
    const a = get(g.employeeId)
    const m = g._sum.minutes ?? 0
    if (billableOf.get(g.clientId)) a.billable += m
    else a.nonBillable += m
  }

  return employees.map((e) => {
    const a = agg.get(e.id)
    const hours = (a?.minutes ?? 0) / 60
    const days = a?.days ?? 0
    const months = a?.months.size ?? 0
    const avgPerDay = days > 0 ? hours / days : 0
    const avgPerMonth = months > 0 ? hours / months : 0
    const costPerHour = costPerHourFor(e, hpm)
    const billableHours = (a?.billable ?? 0) / 60
    const nonBillableHours = (a?.nonBillable ?? 0) / 60
    return {
      id: e.id,
      name: e.name,
      notes: e.notes,
      active: e.active,
      monthlyCost: e.monthlyCost,
      costPerHour,
      hours,
      days,
      months,
      avgPerDay,
      avgPerMonth,
      utilization: utilizationOf({ billableHours, nonBillableHours }),
      billableHours,
      nonBillableHours,
      cost: hours * costPerHour,
    }
  })
}

export type EmployeeDetail = {
  id: string
  name: string
  notes: string | null
  active: boolean
  monthlyCost: number
  costPerHour: number
  hours: number
  days: number
  months: number
  avgPerDay: number
  avgPerMonth: number
  utilization: number | null
  cost: number
  entryCount: number
  billableHours: number
  nonBillableHours: number
  workTypes: { type: string; hours: number; pct: number }[]
  clients: { id: string; name: string; hours: number; cost: number; billable: boolean }[]
  trend: { month: string; label: string; hours: number }[]
}

// Full breakdown for one employee's detail page.
export async function getEmployeeDetail(userId: string, id: string): Promise<EmployeeDetail | null> {
  const settings = await getSettings(userId)
  const hpm = hoursPerMonth(settings)

  const employee = await prisma.employee.findFirst({ where: { id, userId } })
  if (!employee) return null

  const where = { employeeId: id, userId }
  const [dayGroups, typeGroups, clientGroups, clientRows] = await Promise.all([
    prisma.workEntry.groupBy({ by: ['date'], where, _sum: { minutes: true }, _count: { _all: true } }),
    prisma.workEntry.groupBy({ by: ['workType'], where, _sum: { minutes: true } }),
    prisma.workEntry.groupBy({ by: ['clientId'], where, _sum: { minutes: true }, _count: { _all: true } }),
    prisma.client.findMany({ where: { userId }, select: { id: true, name: true, billable: true } }),
  ])
  const cliInfo = new Map(clientRows.map((c) => [c.id, c]))

  let totalMin = 0
  let entryCount = 0
  const monthsMap = new Map<string, number>()
  for (const g of dayGroups) {
    const m = g._sum.minutes ?? 0
    totalMin += m
    entryCount += g._count._all
    const k = monthKey(g.date)
    monthsMap.set(k, (monthsMap.get(k) ?? 0) + m)
  }
  const days = dayGroups.length
  const months = monthsMap.size
  const hours = totalMin / 60
  const avgPerDay = days > 0 ? hours / days : 0
  const avgPerMonth = months > 0 ? hours / months : 0
  const costPerHour = costPerHourFor(employee, hpm)

  let billableMin = 0
  let nonBillableMin = 0
  const clients = clientGroups
    .map((g) => {
      const info = cliInfo.get(g.clientId)
      const m = g._sum.minutes ?? 0
      if (info?.billable) billableMin += m
      else nonBillableMin += m
      return {
        id: g.clientId,
        name: info?.name ?? '—',
        hours: m / 60,
        cost: (m / 60) * costPerHour,
        billable: !!info?.billable,
      }
    })
    .sort((a, b) => b.hours - a.hours)

  const workTypes = typeGroups
    .map((g) => ({ type: g.workType ?? '—', hours: (g._sum.minutes ?? 0) / 60 }))
    .sort((a, b) => b.hours - a.hours)
    .map((t) => ({ ...t, pct: hours > 0 ? t.hours / hours : 0 }))

  const trend = [...monthsMap.entries()]
    .map(([month, min]) => ({ month, hours: min / 60 }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((t) => ({ ...t, label: monthLabel(t.month) }))

  const billableHours = billableMin / 60
  const nonBillableHours = nonBillableMin / 60

  return {
    id: employee.id,
    name: employee.name,
    notes: employee.notes,
    active: employee.active,
    monthlyCost: employee.monthlyCost,
    costPerHour,
    hours,
    days,
    months,
    avgPerDay,
    avgPerMonth,
    utilization: utilizationOf({ billableHours, nonBillableHours }),
    cost: hours * costPerHour,
    entryCount,
    billableHours,
    nonBillableHours,
    workTypes,
    clients,
    trend,
  }
}

export type ClientStatsRow = { hours: number; cost: number }

// Per-client AVERAGE hours and salary cost per active month. Cost is weighted by
// which employee did the work (sum of hours * that employee's cost/hour), then
// divided by the number of distinct months the client had any activity.
export async function getClientsStats(userId: string): Promise<Map<string, ClientStatsRow>> {
  const settings = await getSettings(userId)
  const hpm = hoursPerMonth(settings)

  const [costGroups, monthGroups, employees] = await Promise.all([
    prisma.workEntry.groupBy({ by: ['clientId', 'employeeId'], where: { userId }, _sum: { minutes: true } }),
    prisma.workEntry.groupBy({ by: ['clientId', 'date'], where: { userId }, _sum: { minutes: true } }),
    prisma.employee.findMany({ where: { userId }, select: { id: true, monthlyCost: true, contractHoursPerMonth: true } }),
  ])
  const costPerHour = new Map(employees.map((e) => [e.id, costPerHourFor(e, hpm)]))

  const totalHours = new Map<string, number>()
  const totalCost = new Map<string, number>()
  for (const g of costGroups) {
    const hours = (g._sum.minutes ?? 0) / 60
    const cost = hours * (costPerHour.get(g.employeeId) ?? 0)
    totalHours.set(g.clientId, (totalHours.get(g.clientId) ?? 0) + hours)
    totalCost.set(g.clientId, (totalCost.get(g.clientId) ?? 0) + cost)
  }

  const monthsByClient = new Map<string, Set<string>>()
  for (const g of monthGroups) {
    let s = monthsByClient.get(g.clientId)
    if (!s) {
      s = new Set()
      monthsByClient.set(g.clientId, s)
    }
    s.add(monthKey(g.date))
  }

  const map = new Map<string, ClientStatsRow>()
  for (const clientId of totalHours.keys()) {
    const months = monthsByClient.get(clientId)?.size ?? 0
    const h = totalHours.get(clientId) ?? 0
    const c = totalCost.get(clientId) ?? 0
    map.set(clientId, { hours: months > 0 ? h / months : 0, cost: months > 0 ? c / months : 0 })
  }
  return map
}

// Compact all-time snapshot for the sidebar widget.
export async function getSidebarSummary(userId: string): Promise<{
  hours: number
  cost: number
  clientCount: number
  employeeCount: number
}> {
  const settings = await getSettings(userId)
  const hpm = hoursPerMonth(settings)
  const [grp, employees, clientCount, employeeCount] = await Promise.all([
    prisma.workEntry.groupBy({ by: ['employeeId'], where: { userId }, _sum: { minutes: true } }),
    prisma.employee.findMany({ where: { userId }, select: { id: true, monthlyCost: true, contractHoursPerMonth: true } }),
    prisma.client.count({ where: { active: true, userId } }),
    prisma.employee.count({ where: { active: true, userId } }),
  ])
  const cph = new Map(employees.map((e) => [e.id, costPerHourFor(e, hpm)]))
  let hours = 0
  let cost = 0
  for (const g of grp) {
    const h = (g._sum.minutes ?? 0) / 60
    hours += h
    cost += h * (cph.get(g.employeeId) ?? 0)
  }
  return { hours, cost, clientCount, employeeCount }
}

export type ClientDetail = {
  id: string
  name: string
  notes: string | null
  active: boolean
  billable: boolean
  monthlyRevenue: number
  hours: number
  days: number
  months: number
  avgPerDay: number
  avgPerMonth: number
  entryCount: number
  cost: number
  avgMonthlyCost: number
  profitPerMonth: number
  employees: { id: string; name: string; hours: number; cost: number; pct: number }[]
  workTypes: { type: string; hours: number; pct: number }[]
  trend: { month: string; label: string; hours: number }[]
}

// Full breakdown for one client's profile page.
export async function getClientDetail(userId: string, id: string): Promise<ClientDetail | null> {
  const settings = await getSettings(userId)
  const hpm = hoursPerMonth(settings)

  const client = await prisma.client.findFirst({ where: { id, userId } })
  if (!client) return null

  const where = { clientId: id, userId }
  const [dayGroups, empGroups, typeGroups, employees] = await Promise.all([
    prisma.workEntry.groupBy({ by: ['date'], where, _sum: { minutes: true }, _count: { _all: true } }),
    prisma.workEntry.groupBy({ by: ['employeeId'], where, _sum: { minutes: true } }),
    prisma.workEntry.groupBy({ by: ['workType'], where, _sum: { minutes: true } }),
    prisma.employee.findMany({ where: { userId }, select: { id: true, name: true, monthlyCost: true, contractHoursPerMonth: true } }),
  ])
  const empInfo = new Map(employees.map((e) => [e.id, e]))

  let totalMin = 0
  let entryCount = 0
  const monthsMap = new Map<string, number>()
  for (const g of dayGroups) {
    const m = g._sum.minutes ?? 0
    totalMin += m
    entryCount += g._count._all
    const k = monthKey(g.date)
    monthsMap.set(k, (monthsMap.get(k) ?? 0) + m)
  }
  const days = dayGroups.length
  const months = monthsMap.size
  const hours = totalMin / 60
  const avgPerDay = days > 0 ? hours / days : 0
  const avgPerMonth = months > 0 ? hours / months : 0

  let totalCost = 0
  const employeesArr = empGroups
    .map((g) => {
      const info = empInfo.get(g.employeeId)
      const cph = info ? costPerHourFor(info, hpm) : 0
      const h = (g._sum.minutes ?? 0) / 60
      const c = h * cph
      totalCost += c
      return { id: g.employeeId, name: info?.name ?? '—', hours: h, cost: c, pct: 0 }
    })
    .sort((a, b) => b.hours - a.hours)
  for (const e of employeesArr) e.pct = hours > 0 ? e.hours / hours : 0

  const workTypes = typeGroups
    .map((g) => ({ type: g.workType ?? '—', hours: (g._sum.minutes ?? 0) / 60 }))
    .sort((a, b) => b.hours - a.hours)
    .map((t) => ({ ...t, pct: hours > 0 ? t.hours / hours : 0 }))

  const trend = [...monthsMap.entries()]
    .map(([month, min]) => ({ month, hours: min / 60 }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((t) => ({ ...t, label: monthLabel(t.month) }))

  const avgMonthlyCost = months > 0 ? totalCost / months : 0
  const revenue = client.billable ? client.monthlyRevenue : 0

  return {
    id: client.id,
    name: client.name,
    notes: client.notes,
    active: client.active,
    billable: client.billable,
    monthlyRevenue: client.monthlyRevenue,
    hours,
    days,
    months,
    avgPerDay,
    avgPerMonth,
    entryCount,
    cost: totalCost,
    avgMonthlyCost,
    profitPerMonth: revenue - avgMonthlyCost,
    employees: employeesArr,
    workTypes,
    trend,
  }
}

// --- Day-level entry coverage --------------------------------------------

export type DayLog = {
  date: string // yyyy-mm-dd
  hours: number
  billableHours: number
  missingHours: number // shortfall against the account's daily target, 0 when met
}

// Every day this employee logged something, with the shortfall against the
// daily target. Days with nothing logged are left out on purpose: an empty day
// is leave or a weekend, not an under-filled one.
export async function getEmployeeDayLog(
  userId: string,
  employeeId: string,
  opts: { from?: Date; to?: Date } = {}
): Promise<DayLog[]> {
  const settings = await getSettings(userId)
  const target = settings.hoursPerDay

  const dateFilter: Record<string, Date> = {}
  if (opts.from) dateFilter.gte = opts.from
  if (opts.to) dateFilter.lte = opts.to

  const [groups, clients] = await Promise.all([
    prisma.workEntry.groupBy({
      by: ['date', 'clientId'],
      where: { userId, employeeId, ...(opts.from || opts.to ? { date: dateFilter } : {}) },
      _sum: { minutes: true },
    }),
    prisma.client.findMany({ where: { userId }, select: { id: true, billable: true } }),
  ])
  const billableOf = new Map(clients.map((c) => [c.id, c.billable]))

  const byDay = new Map<string, { hours: number; billableHours: number }>()
  for (const g of groups) {
    const key = g.date.toISOString().slice(0, 10)
    const hours = (g._sum.minutes ?? 0) / 60
    const row = byDay.get(key) ?? { hours: 0, billableHours: 0 }
    row.hours += hours
    if (billableOf.get(g.clientId)) row.billableHours += hours
    byDay.set(key, row)
  }

  return [...byDay.entries()]
    .map(([date, r]) => ({
      date,
      hours: r.hours,
      billableHours: r.billableHours,
      missingHours: Math.max(0, target - r.hours),
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}
