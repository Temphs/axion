import { prisma } from '@/lib/db'
import { getSettings, hoursPerMonth } from '@/lib/settings'

const MS_PER_AVG_MONTH = 1000 * 60 * 60 * 24 * 30.4375

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
  roi: number | null
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
  capacityHours: number
  utilization: number | null
}

export type Stats = {
  range: { from: string | null; to: string | null; months: number }
  settings: { hoursPerDay: number; daysPerMonth: number; hoursPerMonth: number; includeOverhead: boolean }
  summary: StatsSummary
  employees: EmployeeStat[]
  clients: ClientStat[]
}

function monthsBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return ms > 0 ? ms / MS_PER_AVG_MONTH : 0
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

export async function buildStats(filter: StatsFilter): Promise<Stats> {
  const settings = await getSettings()
  const hpm = hoursPerMonth(settings)

  const where: Record<string, unknown> = {}
  if (filter.employeeId) where.employeeId = filter.employeeId
  if (filter.clientId) where.clientId = filter.clientId
  const dateFilter: Record<string, Date> = {}
  if (filter.from) dateFilter.gte = filter.from
  if (filter.to) dateFilter.lte = filter.to
  if (Object.keys(dateFilter).length) where.date = dateFilter

  const entries = await prisma.workEntry.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, monthlyCost: true } },
      client: { select: { id: true, name: true, billable: true, monthlyRevenue: true } },
    },
  })

  // Effective range: explicit bounds, else the span of the matched entries.
  const dates = entries.map((e) => e.date.getTime())
  const from = filter.from ?? (dates.length ? new Date(Math.min(...dates)) : null)
  const to = filter.to ?? (dates.length ? new Date(Math.max(...dates)) : null)
  const months = from && to ? monthsBetween(from, to) : 0

  const costPerHour = (monthlyCost: number) => (hpm > 0 ? monthlyCost / hpm : 0)

  const employeeMap = new Map<string, EmployeeStat>()
  const clientMap = new Map<string, ClientStat>()
  let totalHours = 0
  let totalCost = 0
  let billableHours = 0
  let nonBillableHours = 0

  for (const e of entries) {
    const hours = e.minutes / 60
    const cost = hours * costPerHour(e.employee.monthlyCost)
    totalHours += hours
    totalCost += cost
    if (e.client.billable) billableHours += hours
    else nonBillableHours += hours

    // Per employee, with a per-client breakdown.
    let emp = employeeMap.get(e.employeeId)
    if (!emp) {
      emp = { id: e.employee.id, name: e.employee.name, hours: 0, cost: 0, clients: [] }
      employeeMap.set(e.employeeId, emp)
    }
    emp.hours += hours
    emp.cost += cost
    let empClient = emp.clients.find((c) => c.id === e.clientId)
    if (!empClient) {
      empClient = { id: e.client.id, name: e.client.name, hours: 0, cost: 0 }
      emp.clients.push(empClient)
    }
    empClient.hours += hours
    empClient.cost += cost

    // Per client.
    let cli = clientMap.get(e.clientId)
    if (!cli) {
      cli = {
        id: e.client.id,
        name: e.client.name,
        billable: e.client.billable,
        monthlyRevenue: e.client.monthlyRevenue,
        hours: 0,
        cost: 0,
        revenue: 0,
        profit: 0,
        roi: null,
        revenuePerHour: 0,
      }
      clientMap.set(e.clientId, cli)
    }
    cli.hours += hours
    cli.cost += cost
  }

  // Finalize per-client revenue/profit/ROI using the prorated revenue for the range.
  for (const cli of clientMap.values()) {
    cli.revenue = cli.monthlyRevenue * months
    cli.profit = cli.revenue - cli.cost
    cli.roi = cli.cost > 0 ? cli.profit / cli.cost : null
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

  const activeEmployees = await prisma.employee.count({ where: { active: true } })
  const capacityHours = activeEmployees * hpm * (months || 0)

  const summary: StatsSummary = {
    hours: summaryHours,
    cost: summaryCost,
    revenue: summaryRevenue,
    profit: summaryRevenue - summaryCost,
    billableHours,
    nonBillableHours,
    entryCount: entries.length,
    employeeCount: employeeMap.size,
    clientCount: clientMap.size,
    capacityHours,
    utilization: capacityHours > 0 ? totalHours / capacityHours : null,
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
  billablePct: number | null
  cost: number
}

// Per-employee headline metrics for the cards grid. Aggregated in the database.
export async function getEmployeesOverview(): Promise<EmployeeOverview[]> {
  const settings = await getSettings()
  const hpm = hoursPerMonth(settings)

  const [employees, dayGroups, clientGroups, clients] = await Promise.all([
    prisma.employee.findMany({ orderBy: { name: 'asc' } }),
    prisma.workEntry.groupBy({ by: ['employeeId', 'date'], _sum: { minutes: true } }),
    prisma.workEntry.groupBy({ by: ['employeeId', 'clientId'], _sum: { minutes: true } }),
    prisma.client.findMany({ select: { id: true, billable: true } }),
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
    const costPerHour = hpm > 0 ? e.monthlyCost / hpm : 0
    const billableHours = (a?.billable ?? 0) / 60
    const nonBillableHours = (a?.nonBillable ?? 0) / 60
    const totalBN = billableHours + nonBillableHours
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
      utilization: hpm > 0 ? avgPerMonth / hpm : null,
      billableHours,
      nonBillableHours,
      billablePct: totalBN > 0 ? billableHours / totalBN : null,
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
  billablePct: number | null
  workTypes: { type: string; hours: number; pct: number }[]
  clients: { id: string; name: string; hours: number; cost: number; billable: boolean }[]
  trend: { month: string; label: string; hours: number }[]
}

// Full breakdown for one employee's detail page.
export async function getEmployeeDetail(id: string): Promise<EmployeeDetail | null> {
  const settings = await getSettings()
  const hpm = hoursPerMonth(settings)

  const employee = await prisma.employee.findUnique({ where: { id } })
  if (!employee) return null

  const where = { employeeId: id }
  const [dayGroups, typeGroups, clientGroups, clientRows] = await Promise.all([
    prisma.workEntry.groupBy({ by: ['date'], where, _sum: { minutes: true }, _count: { _all: true } }),
    prisma.workEntry.groupBy({ by: ['workType'], where, _sum: { minutes: true } }),
    prisma.workEntry.groupBy({ by: ['clientId'], where, _sum: { minutes: true }, _count: { _all: true } }),
    prisma.client.findMany({ select: { id: true, name: true, billable: true } }),
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
  const costPerHour = hpm > 0 ? employee.monthlyCost / hpm : 0

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
  const totalBN = billableHours + nonBillableHours

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
    utilization: hpm > 0 ? avgPerMonth / hpm : null,
    cost: hours * costPerHour,
    entryCount,
    billableHours,
    nonBillableHours,
    billablePct: totalBN > 0 ? billableHours / totalBN : null,
    workTypes,
    clients,
    trend,
  }
}

export type ClientStatsRow = { hours: number; cost: number }

// Per-client AVERAGE hours and salary cost per active month. Cost is weighted by
// which employee did the work (sum of hours * that employee's cost/hour), then
// divided by the number of distinct months the client had any activity.
export async function getClientsStats(): Promise<Map<string, ClientStatsRow>> {
  const settings = await getSettings()
  const hpm = hoursPerMonth(settings)

  const [costGroups, monthGroups, employees] = await Promise.all([
    prisma.workEntry.groupBy({ by: ['clientId', 'employeeId'], _sum: { minutes: true } }),
    prisma.workEntry.groupBy({ by: ['clientId', 'date'], _sum: { minutes: true } }),
    prisma.employee.findMany({ select: { id: true, monthlyCost: true } }),
  ])
  const costPerHour = new Map(employees.map((e) => [e.id, hpm > 0 ? e.monthlyCost / hpm : 0]))

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
