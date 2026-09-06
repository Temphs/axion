import { describe, it, expect } from 'vitest'
import {
  allocateProRata,
  clientHealth,
  computeInsights,
  contributionMargin,
  costPerHourFor,
  findPricingOpportunities,
  monthCoverage,
  monthlyHoursFor,
  monthsInPeriod,
  previousPeriodOf,
  safeRatio,
  type ClientRow,
  type EmployeeRow,
} from '@/lib/profitability'

describe('safeRatio / contributionMargin', () => {
  it('divides safely and returns null on zero denominators', () => {
    expect(safeRatio(50, 100)).toBe(0.5)
    expect(safeRatio(50, 0)).toBeNull()
    expect(safeRatio(0, 100)).toBe(0)
  })

  it('computes margin and hides it without revenue', () => {
    expect(contributionMargin(10_000, 4_500)).toBeCloseTo(0.55)
    expect(contributionMargin(0, 500)).toBeNull()
  })
})

describe('contract hours', () => {
  it('falls back to the account default when no contract is set', () => {
    expect(monthlyHoursFor({ contractHoursPerMonth: null }, 176)).toBe(176)
    expect(monthlyHoursFor({}, 176)).toBe(176)
  })

  it('uses the employee contract when set', () => {
    expect(monthlyHoursFor({ contractHoursPerMonth: 80 }, 176)).toBe(80)
  })

  it('prices a part-timer against their own contract, not the company default', () => {
    const employee = { monthlyCost: 1800, contractHoursPerMonth: 80 }
    expect(costPerHourFor(employee, 176)).toBeCloseTo(22.5)
    // Same salary judged on the full-time default would look far cheaper.
    expect(costPerHourFor({ monthlyCost: 1800 }, 176)).toBeCloseTo(10.227, 3)
  })

  it('never divides by zero hours', () => {
    expect(costPerHourFor({ monthlyCost: 1800, contractHoursPerMonth: 0 }, 176)).toBe(0)
    expect(costPerHourFor({ monthlyCost: 1800 }, 0)).toBe(0)
  })
})

describe('monthCoverage / periods', () => {
  it('covers full months exactly', () => {
    const cov = monthCoverage(new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2026, 2, 31)))
    expect([...cov.keys()]).toEqual(['2026-01', '2026-02', '2026-03'])
    for (const f of cov.values()) expect(f).toBeCloseTo(1)
    expect(monthsInPeriod(new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2026, 2, 31)))).toBeCloseTo(3)
  })

  it('prorates partial months by days', () => {
    // 1–15 June = 15/30 of the month
    const cov = monthCoverage(new Date(Date.UTC(2026, 5, 1)), new Date(Date.UTC(2026, 5, 15)))
    expect(cov.get('2026-06')).toBeCloseTo(0.5)
  })

  it('previous period of a month-aligned range is the preceding months', () => {
    const prev = previousPeriodOf(new Date(Date.UTC(2026, 6, 1)), new Date(Date.UTC(2026, 6, 20)))
    expect(prev.from.toISOString().slice(0, 10)).toBe('2026-06-01')
    expect(prev.to.toISOString().slice(0, 10)).toBe('2026-06-30')
  })
})

describe('allocateProRata (revenue attribution)', () => {
  it('splits revenue proportionally to hours', () => {
    const shares = allocateProRata(1000, new Map([['maria', 6], ['andreas', 4]]))
    expect(shares.get('maria')).toBeCloseTo(600)
    expect(shares.get('andreas')).toBeCloseTo(400)
  })

  it('returns nothing when no hours were logged', () => {
    expect(allocateProRata(1000, new Map()).size).toBe(0)
    expect(allocateProRata(1000, new Map([['a', 0]])).size).toBe(0)
  })

  it('conserves the full amount', () => {
    const shares = allocateProRata(999.99, new Map([['a', 3.3], ['b', 7.7], ['c', 11]]))
    const total = [...shares.values()].reduce((s, v) => s + v, 0)
    expect(total).toBeCloseTo(999.99)
  })
})

describe('statuses', () => {
  it('classifies client health by margin', () => {
    expect(clientHealth(0.72, true, true)).toBe('healthy')
    expect(clientHealth(0.56, true, true)).toBe('healthy')
    expect(clientHealth(0.3, true, true)).toBe('watch')
    expect(clientHealth(0.11, true, true)).toBe('critical')
    expect(clientHealth(null, true, false)).toBe('critical') // hours but no fee set
    expect(clientHealth(null, false, false)).toBe('overhead')
  })

})

/* ─── insight rules ──────────────────────────────────────────── */

function emp(over: Partial<EmployeeRow>): EmployeeRow {
  return {
    id: 'e1',
    name: 'Andreas',
    active: true,
    costPerHour: 20,
    hours: 100,
    billableHours: 80,
    nonBillableHours: 20,
    unbilledHours: 20,
    activeDays: 20,
    firstEntry: '2026-03-02',
    lastEntry: '2026-03-27',
    incompleteDays: 0,
    missingHours: 0,
    utilization: 0.5,
    revenue: 5000,
    laborCost: 2000,
    contribution: 3000,
    margin: 0.6,
    revenuePerHour: 62.5,
    targets: { utilizationPct: null, monthlyHours: null, monthlyContribution: null },
    clients: [],
    ...over,
  }
}

function cli(over: Partial<ClientRow>): ClientRow {
  return {
    id: 'c1',
    name: 'Hotel ABC',
    billable: true,
    active: true,
    monthlyRevenue: 800,
    revenue: 800,
    hours: 31,
    laborCost: 710,
    contribution: 90,
    margin: 0.11,
    revenuePerHour: 25.8,
    health: 'critical',
    plannedHours: null,
    plannedMonthlyHours: null,
    hoursVariance: null,
    budgetConsumed: null,
    employees: [],
    ...over,
  }
}


describe('computeInsights', () => {
  it('flags a client whose margin dropped sharply, citing the hours increase', () => {
    const insights = computeInsights({
      employees: [],
      clients: [cli({ margin: 0.21 })],
      previousClients: new Map([['c1', { margin: 0.43, hours: 22 }]]),
      companyRevenuePerHour: null,
      defaultUtilizationTarget: 0.75,
      periodElapsedFraction: 1,
    })
    expect(insights.some((i) => i.kind === 'client_margin' && i.message.includes('43%') && i.message.includes('21%'))).toBe(true)
    expect(insights[0].message).toContain('αυξήθηκαν')
  })

  it('flags utilization clearly below target', () => {
    const insights = computeInsights({
      employees: [emp({ utilization: 0.58, targets: { utilizationPct: 75, monthlyHours: null, monthlyContribution: null } })],
      clients: [],
      previousClients: new Map(),
      companyRevenuePerHour: null,
      defaultUtilizationTarget: 0.75,
      periodElapsedFraction: 1,
    })
    expect(insights.some((i) => i.kind === 'utilization' && i.message.includes('58%') && i.message.includes('75%'))).toBe(true)
  })

  it('flags budget overrun and early over-consumption', () => {
    const over = computeInsights({
      employees: [],
      clients: [cli({ plannedHours: 40, budgetConsumed: 52 / 40, hours: 52 })],
      previousClients: new Map(),
      companyRevenuePerHour: null,
      defaultUtilizationTarget: 0.75,
      periodElapsedFraction: 0.5,
    })
    expect(over.some((i) => i.kind === 'budget_overrun' && i.severity === 'critical')).toBe(true)

    const early = computeInsights({
      employees: [],
      clients: [cli({ plannedHours: 100, budgetConsumed: 0.92, hours: 92 })],
      previousClients: new Map(),
      companyRevenuePerHour: null,
      defaultUtilizationTarget: 0.75,
      periodElapsedFraction: 0.6,
    })
    expect(early.some((i) => i.kind === 'budget_overrun' && i.severity === 'warning')).toBe(true)
  })

  it('flags pricing when revenue/hour is far below company average', () => {
    const insights = computeInsights({
      employees: [],
      clients: [cli({ revenuePerHour: 24, margin: 0.3 })],
      previousClients: new Map(),
      companyRevenuePerHour: 51,
      defaultUtilizationTarget: 0.75,
      periodElapsedFraction: 1,
    })
    expect(insights.some((i) => i.kind === 'pricing' && i.message.includes('€24') && i.message.includes('€51'))).toBe(true)
  })

  it('stays silent when everything is in range', () => {
    const insights = computeInsights({
      employees: [emp({ utilization: 0.8 })],
      clients: [cli({ margin: 0.6, revenuePerHour: 80, health: 'healthy' })],
      previousClients: new Map([['c1', { margin: 0.58, hours: 30 }]]),
      companyRevenuePerHour: 80,
      defaultUtilizationTarget: 0.75,
      periodElapsedFraction: 0.5,
    })
    expect(insights).toHaveLength(0)
  })
})

describe('findPricingOpportunities', () => {
  it('collects low-margin and below-average clients with reasons', () => {
    const out = findPricingOpportunities(
      [
        cli({ id: 'bad', name: 'Hotel ABC', margin: 0.11, revenuePerHour: 25.8 }),
        cli({ id: 'good', name: 'Papadakis AE', margin: 0.72, revenuePerHour: 83, health: 'healthy' }),
      ],
      51.2
    )
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Hotel ABC')
    expect(out[0].reasons.length).toBeGreaterThanOrEqual(2)
  })

  it('ignores clients with too few hours', () => {
    const out = findPricingOpportunities([cli({ hours: 2, margin: 0.05 })], 50)
    expect(out).toHaveLength(0)
  })

  it('flags billable clients with hours but no configured fee', () => {
    const out = findPricingOpportunities([cli({ revenue: 0, margin: null, revenuePerHour: 0 })], 50)
    expect(out).toHaveLength(1)
    expect(out[0].reasons.join(' ')).toContain('Δεν έχει οριστεί έσοδο')
  })
})
