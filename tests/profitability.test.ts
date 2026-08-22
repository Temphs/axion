import { describe, it, expect } from 'vitest'
import {
  allocateProRata,
  billableShare,
  buildDayLog,
  clientHealth,
  clientsNeedingAttention,
  completenessOf,
  contributionMargin,
  costPerHourFor,
  employedWindow,
  employmentStatusOf,
  entryCompleteness,
  expectedHoursFor,
  expectedWorkingDaysFor,
  hoursSplit,
  monthCoverage,
  monthlyHoursFor,
  monthsInPeriod,
  outstandingAmount,
  paymentStatusOf,
  percentChange,
  previousPeriodOf,
  safeRatio,
  workingDaysBetween,
  type ClientRow,
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

describe('clientHealth', () => {
  it('classifies client health by margin', () => {
    expect(clientHealth(0.72, true, true)).toBe('healthy')
    expect(clientHealth(0.56, true, true)).toBe('healthy')
    expect(clientHealth(0.3, true, true)).toBe('watch')
    expect(clientHealth(0.11, true, true)).toBe('critical')
    expect(clientHealth(null, true, false)).toBe('critical') // hours but no fee set
    expect(clientHealth(null, false, false)).toBe('overhead')
  })
})

function cli(over: Partial<ClientRow>): ClientRow {
  return {
    id: 'c1',
    name: 'Hotel ABC',
    billable: true,
    active: true,
    monthlyRevenue: 800,
    revenue: 800,
    hours: 10,
    laborCost: 400,
    contribution: 400,
    margin: 0.5,
    revenuePerHour: 80,
    health: 'healthy',
    plannedHours: null,
    plannedMonthlyHours: null,
    hoursVariance: null,
    budgetConsumed: null,
    employees: [],
    ...over,
  }
}

describe('billableShare', () => {
  it('is the share of worked hours spent on billable clients', () => {
    expect(billableShare(80, 100)).toBe(0.8)
    expect(billableShare(0, 100)).toBe(0)
  })

  it('is undefined rather than zero when nothing was worked', () => {
    expect(billableShare(0, 0)).toBeNull()
  })
})

describe('percentChange', () => {
  it('compares against the previous period', () => {
    expect(percentChange(112, 100)).toBeCloseTo(0.12)
    expect(percentChange(92, 100)).toBeCloseTo(-0.08)
  })

  it('has no opinion without a comparable base', () => {
    expect(percentChange(50, 0)).toBeNull()
    expect(percentChange(50, null)).toBeNull()
    expect(percentChange(50, undefined)).toBeNull()
  })
})

describe('workingDaysBetween', () => {
  it('counts Monday to Friday only', () => {
    // 3–9 Aug 2026 is a Mon–Sun week.
    expect(workingDaysBetween(new Date(Date.UTC(2026, 7, 3)), new Date(Date.UTC(2026, 7, 9)), new Date(Date.UTC(2026, 7, 31)))).toBe(5)
  })

  it('never counts past today', () => {
    const from = new Date(Date.UTC(2026, 7, 3))
    const to = new Date(Date.UTC(2026, 7, 31))
    const today = new Date(Date.UTC(2026, 7, 5)) // Wednesday
    expect(workingDaysBetween(from, to, today)).toBe(3)
  })
})

describe('entryCompleteness', () => {
  it('averages logged days against expected working days', () => {
    // Two employees, 10 expected days: one logged all 10, one logged 8 → 90%.
    expect(entryCompleteness([10, 8], 10)).toBeCloseTo(0.9)
  })

  it('caps an over-logging employee at 100% of their own days', () => {
    expect(entryCompleteness([12], 10)).toBe(1)
  })

  it('stays silent when there is nothing to measure', () => {
    expect(entryCompleteness([], 10)).toBeNull()
    expect(entryCompleteness([5], 0)).toBeNull()
  })
})

describe('clientsNeedingAttention', () => {
  const noHistory = new Map<string, number>()

  it('flags a client consuming far more hours than the average', () => {
    const items = clientsNeedingAttention({
      clients: [
        cli({ id: 'heavy', name: 'Hotel ABC', hours: 21.4 }),
        cli({ id: 'a', name: 'Client A', hours: 6 }),
        cli({ id: 'b', name: 'Client B', hours: 5 }),
      ],
      previousHoursByClient: noHistory,
    })
    const heavy = items.find((i) => i.clientId === 'heavy')
    expect(heavy).toBeDefined()
    expect(heavy!.reason).toContain('21.4ω')
    expect(heavy!.reason).toContain('× περισσότερες ώρες')
    // Median of (5, 6, 21.4) is 6, so the factor is reported against that.
    expect(heavy!.reason).toContain('3.6×')
  })

  it('flags a fee that does not cover the work', () => {
    const items = clientsNeedingAttention({
      clients: [cli({ id: 'thin', name: 'Papadakis AE', margin: 0.18, hours: 8 })],
      previousHoursByClient: noHistory,
    })
    expect(items).toHaveLength(1)
    expect(items[0].reason).toContain('18%')
    expect(items[0].reason).toContain('κάτω από τον στόχο')
  })

  it('flags a sharp increase in hours against last period', () => {
    const items = clientsNeedingAttention({
      clients: [cli({ id: 'growing', name: 'XYZ OE', hours: 13.4, margin: 0.6 })],
      previousHoursByClient: new Map([['growing', 10]]),
    })
    expect(items).toHaveLength(1)
    expect(items[0].reason).toContain('34%')
  })

  it('never returns more than three items', () => {
    const many = Array.from({ length: 8 }, (_, i) => cli({ id: `c${i}`, name: `C${i}`, margin: 0.05, hours: 10 }))
    expect(clientsNeedingAttention({ clients: many, previousHoursByClient: noHistory })).toHaveLength(3)
  })

  it('ignores overhead clients and trivial amounts of time', () => {
    const items = clientsNeedingAttention({
      clients: [
        cli({ id: 'overhead', billable: false, margin: 0.01, hours: 40 }),
        cli({ id: 'tiny', hours: 1, margin: 0.01 }),
      ],
      previousHoursByClient: noHistory,
    })
    expect(items).toHaveLength(0)
  })

  it('stays quiet when every client looks normal', () => {
    const items = clientsNeedingAttention({
      clients: [cli({ id: 'a', hours: 10 }), cli({ id: 'b', hours: 11 }), cli({ id: 'c', hours: 9 })],
      previousHoursByClient: new Map([['a', 10], ['b', 10], ['c', 10]]),
    })
    expect(items).toHaveLength(0)
  })
})

/* ── employment window ─────────────────────────────────────────── */

describe('employment window', () => {
  // August 2026 starts on a Saturday: 21 working days (3–7, 10–14, 17–21, 24–28, 31).
  const from = new Date(Date.UTC(2026, 7, 1))
  const to = new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999))
  const afterPeriod = new Date(Date.UTC(2026, 8, 30))
  const open = { startedOn: null, endedOn: null }

  it('expects every working day when no dates are recorded', () => {
    expect(expectedWorkingDaysFor(from, to, open, afterPeriod)).toBe(21)
  })

  it('expects nothing after the leaving date', () => {
    const left = { startedOn: null, endedOn: new Date(Date.UTC(2026, 7, 12)) }
    expect(expectedWorkingDaysFor(from, to, left, afterPeriod)).toBe(8) // 3–7 plus 10–12
  })

  it('does not count the days before the hire date as missing', () => {
    const hired = { startedOn: new Date(Date.UTC(2026, 7, 10)), endedOn: null }
    expect(expectedWorkingDaysFor(from, to, hired, afterPeriod)).toBe(16)
  })

  it('never expects hours in the future', () => {
    const midMonth = new Date(Date.UTC(2026, 7, 14, 12))
    expect(expectedWorkingDaysFor(from, to, open, midMonth)).toBe(10) // 3–7 and 10–14
  })

  it('returns no window when employment and period do not overlap', () => {
    const gone = { startedOn: null, endedOn: new Date(Date.UTC(2026, 5, 30)) }
    expect(employedWindow(from, to, gone, afterPeriod)).toBeNull()
    expect(expectedWorkingDaysFor(from, to, gone, afterPeriod)).toBe(0)
  })

  it('reads a past leaving date as a former employee', () => {
    const now = new Date(Date.UTC(2026, 7, 17))
    expect(employmentStatusOf({ startedOn: null, endedOn: new Date(Date.UTC(2026, 7, 12)) }, now)).toBe('former')
    expect(employmentStatusOf(open, now)).toBe('active')
  })
})

/* ── data completeness ─────────────────────────────────────────── */

describe('entry completeness per employee', () => {
  it('divides logged days by expected days and caps at 100%', () => {
    expect(completenessOf(19, 20)).toBeCloseTo(0.95)
    expect(completenessOf(22, 20)).toBe(1)
    expect(completenessOf(5, 0)).toBeNull()
  })

  it('turns expected days into expected hours', () => {
    expect(expectedHoursFor(20, 8)).toBe(160)
    expect(expectedHoursFor(0, 8)).toBe(0)
  })

  it('marks short days and missing days, and skips empty weekends', () => {
    const hours = new Map([
      ['2026-08-03', 8],
      ['2026-08-04', 8],
      ['2026-08-05', 6],
      ['2026-08-07', 8],
    ])
    const log = buildDayLog(
      new Date(Date.UTC(2026, 7, 3)),
      new Date(Date.UTC(2026, 7, 9, 23, 59, 59, 999)),
      hours,
      { startedOn: null, endedOn: null },
      8,
      new Date(Date.UTC(2026, 8, 30))
    )
    expect(log.map((d) => d.status)).toEqual(['ok', 'ok', 'short', 'missing', 'ok'])
    expect(log).toHaveLength(5) // the weekend is not missing data
  })

  it('keeps a weekend that was actually worked', () => {
    const log = buildDayLog(
      new Date(Date.UTC(2026, 7, 8)),
      new Date(Date.UTC(2026, 7, 9, 23, 59, 59, 999)),
      new Map([['2026-08-08', 4]]),
      { startedOn: null, endedOn: null },
      8,
      new Date(Date.UTC(2026, 8, 30))
    )
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ date: '2026-08-08', hours: 4, expected: 0, status: 'ok' })
  })

  it('stops the day log at the leaving date', () => {
    const log = buildDayLog(
      new Date(Date.UTC(2026, 7, 3)),
      new Date(Date.UTC(2026, 7, 14, 23, 59, 59, 999)),
      new Map(),
      { startedOn: null, endedOn: new Date(Date.UTC(2026, 7, 5)) },
      8,
      new Date(Date.UTC(2026, 8, 30))
    )
    expect(log.map((d) => d.date)).toEqual(['2026-08-03', '2026-08-04', '2026-08-05'])
  })
})

/* ── billable / overhead split ─────────────────────────────────── */

describe('hoursSplit', () => {
  it('splits a month into percentages of its own total', () => {
    const s = hoursSplit(124, 36)
    expect(s.total).toBe(160)
    expect(s.billablePct).toBeCloseTo(0.775)
    expect(s.overheadPct).toBeCloseTo(0.225)
  })

  it('has no percentages for a month with no hours', () => {
    const s = hoursSplit(0, 0)
    expect(s.total).toBe(0)
    expect(s.billablePct).toBeNull()
    expect(s.overheadPct).toBeNull()
  })
})

/* ── client payments ───────────────────────────────────────────── */

describe('client payments', () => {
  it('computes what is still owed', () => {
    expect(outstandingAmount(650, 400)).toBe(250)
    expect(outstandingAmount(650, 650)).toBe(0)
    expect(outstandingAmount(650, 800)).toBe(0) // an overpayment is not a negative debt
    expect(outstandingAmount(650, null)).toBe(650)
    expect(outstandingAmount(null, 400)).toBeNull()
  })

  it('reports a status only when both numbers are recorded', () => {
    expect(paymentStatusOf({ invoiced: 650, paid: 650 })).toBe('paid')
    expect(paymentStatusOf({ invoiced: 650, paid: 400 })).toBe('partial')
    expect(paymentStatusOf({ invoiced: 650, paid: 0 })).toBe('outstanding')
    expect(paymentStatusOf({ invoiced: null, paid: null })).toBe('unknown')
    expect(paymentStatusOf({ invoiced: 0, paid: 0 })).toBe('unknown')
  })
})
