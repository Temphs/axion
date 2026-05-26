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
